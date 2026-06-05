import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import db, { initDB } from './database'

// 1. FORÇA O NOME DO APLICATIVO EM TODOS OS ALERTAS DO SISTEMA
app.setName('Parcelas');

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    title: 'Parcelas', // 2. FORÇA O NOME NA BARRA DE TÍTULO DA JANELA
    icon: icon,        // 3. FORÇA O SEU ÍCONE PERSONALIZADO NA BARRA DE TAREFAS
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => { mainWindow.show() })
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  initDB()
  db.run("ALTER TABLE purchases ADD COLUMN category TEXT", [], () => {});

  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => { optimizer.watchWindowShortcuts(window) })

  // --- CARTÕES ---
  ipcMain.handle('get-cards', () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM cards', [], (err, rows) => { if (err) reject(err); else resolve(rows); })
    })
  })

  ipcMain.handle('add-card', (_, card) => {
    return new Promise((resolve) => {
      const { name, closingDate, dueDate, limitTotal } = card
      db.run('INSERT INTO cards (name, closingDate, dueDate, limitTotal) VALUES (?, ?, ?, ?)',
        [name, closingDate, dueDate, limitTotal],
        function (err) { if (err) resolve({ success: false, error: err.message }); else resolve({ success: true, id: this.lastID }); }
      )
    })
  })

  ipcMain.handle('update-card', (_, card) => {
    return new Promise((resolve) => {
      db.run('UPDATE cards SET name = ?, closingDate = ?, dueDate = ?, limitTotal = ? WHERE id = ?',
        [card.name, card.closingDate, card.dueDate, card.limitTotal, card.id],
        function (err) { if (err) resolve({ success: false, error: err.message }); else resolve({ success: true }); }
      )
    })
  })

  ipcMain.handle('delete-card', async (_, id) => {
    return new Promise((resolve) => {
      db.run('DELETE FROM cards WHERE id = ?', [id], function (err) {
        if (err) resolve({ success: false, error: err.message }); else resolve({ success: true });
      })
    })
  })

  // --- COMPRAS E PARCELAS ---
  ipcMain.handle('add-purchase', async (_, purchase) => {
    try {
      const { cardId, description, totalAmount, installmentsCount, purchaseDate, category } = purchase;
      const card: any = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM cards WHERE id = ?', [cardId], (err, row) => { if (err) reject(err); else resolve(row); });
      });
      if (!card) throw new Error("Cartão não encontrado");

      const purchaseId: any = await new Promise((resolve, reject) => {
        db.run('INSERT INTO purchases (cardId, description, totalAmount, installmentsCount, purchaseDate, category) VALUES (?, ?, ?, ?, ?, ?)',
          [cardId, description, totalAmount, installmentsCount, purchaseDate, category || 'Outros'],
          function (err) { if (err) reject(err); else resolve(this.lastID); }
        );
      });

      const amountPerInstallment = totalAmount / installmentsCount;
      const purchaseDateObj = new Date(purchaseDate + 'T00:00:00'); 
      const purchaseDay = purchaseDateObj.getDate();
      let baseMonth = purchaseDateObj.getMonth();
      let baseYear = purchaseDateObj.getFullYear();

      if (purchaseDay >= card.closingDate) baseMonth += 1;

      for (let i = 0; i < installmentsCount; i++) {
        let targetMonth = baseMonth + i;
        let targetYear = baseYear;
        while (targetMonth > 11) { targetMonth -= 12; targetYear += 1; }

        const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const actualDueDay = Math.min(card.dueDate, lastDayOfMonth);
        const dueDateObj = new Date(targetYear, targetMonth, actualDueDay);
        
        const offset = dueDateObj.getTimezoneOffset();
        const localDate = new Date(dueDateObj.getTime() - (offset * 60 * 1000));
        const formattedDueDate = localDate.toISOString().split('T')[0]; 

        await new Promise((resolve, reject) => {
          db.run('INSERT INTO installments (purchaseId, installmentNumber, amount, dueDate, status) VALUES (?, ?, ?, ?, ?)',
            [purchaseId, `${i + 1}/${installmentsCount}`, amountPerInstallment, formattedDueDate, 'Pendente'],
            function (err) { if (err) reject(err); else resolve(this.lastID); }
          );
        });
      }
      return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
  })

  ipcMain.handle('update-purchase', async (_, purchase) => {
    try {
      const { id, cardId, description, totalAmount, installmentsCount, purchaseDate, category } = purchase;
      
      const card: any = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM cards WHERE id = ?', [cardId], (err, row) => { if (err) reject(err); else resolve(row); });
      });
      if (!card) throw new Error("Cartão não encontrado");

      // 1. Deletar as parcelas antigas
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM installments WHERE purchaseId = ?', [id], function(err) { if (err) reject(err); else resolve(this.changes); });
      });

      // 2. Atualizar a compra
      await new Promise((resolve, reject) => {
        db.run('UPDATE purchases SET cardId=?, description=?, totalAmount=?, installmentsCount=?, purchaseDate=?, category=? WHERE id=?',
          [cardId, description, totalAmount, installmentsCount, purchaseDate, category || 'Outros', id],
          function (err) { if (err) reject(err); else resolve(this.changes); }
        );
      });

      // 3. Recalcular e gerar as novas parcelas
      const amountPerInstallment = totalAmount / installmentsCount;
      const purchaseDateObj = new Date(purchaseDate + 'T00:00:00'); 
      const purchaseDay = purchaseDateObj.getDate();
      let baseMonth = purchaseDateObj.getMonth();
      let baseYear = purchaseDateObj.getFullYear();

      if (purchaseDay >= card.closingDate) baseMonth += 1;

      for (let i = 0; i < installmentsCount; i++) {
        let targetMonth = baseMonth + i;
        let targetYear = baseYear;
        while (targetMonth > 11) { targetMonth -= 12; targetYear += 1; }

        const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const actualDueDay = Math.min(card.dueDate, lastDayOfMonth);
        const dueDateObj = new Date(targetYear, targetMonth, actualDueDay);
        
        const offset = dueDateObj.getTimezoneOffset();
        const localDate = new Date(dueDateObj.getTime() - (offset * 60 * 1000));
        const formattedDueDate = localDate.toISOString().split('T')[0]; 

        await new Promise((resolve, reject) => {
          db.run('INSERT INTO installments (purchaseId, installmentNumber, amount, dueDate, status) VALUES (?, ?, ?, ?, ?)',
            [id, `${i + 1}/${installmentsCount}`, amountPerInstallment, formattedDueDate, 'Pendente'],
            function (err) { if (err) reject(err); else resolve(this.lastID); }
          );
        });
      }
      return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
  })

  ipcMain.handle('get-purchases', () => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          p.id, p.cardId, p.purchaseDate as date, p.description as desc, p.category,
          COALESCE(c.name, 'Cartão Excluído') as card, p.totalAmount as total, p.installmentsCount as parcelas,
          CASE 
            WHEN (SELECT COUNT(*) FROM installments WHERE purchaseId = p.id AND status = 'Pendente') = 0 THEN 'Finalizada'
            ELSE 'Ativa'
          END as status
        FROM purchases p LEFT JOIN cards c ON p.cardId = c.id ORDER BY p.id DESC
      `;
      db.all(query, [], (err, rows) => { if (err) reject(err); else resolve(rows); })
    })
  })

  ipcMain.handle('get-installments', () => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT i.id, i.installmentNumber, i.amount, i.dueDate, i.status, p.description as desc, COALESCE(c.name, 'Cartão Excluído') as card
        FROM installments i JOIN purchases p ON i.purchaseId = p.id LEFT JOIN cards c ON p.cardId = c.id ORDER BY i.dueDate ASC
      `;
      db.all(query, [], (err, rows) => { if (err) reject(err); else resolve(rows); })
    })
  })

  ipcMain.handle('delete-purchase', async (_, id) => {
    try {
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM installments WHERE purchaseId = ?', [id], function(err) { if (err) reject(err); else resolve(this.changes); });
      });
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM purchases WHERE id = ?', [id], function(err) { if (err) reject(err); else resolve(this.changes); });
      });
      return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
  })

  ipcMain.handle('update-installment-status', async (_, id, status) => {
    return new Promise((resolve) => {
      db.run('UPDATE installments SET status = ? WHERE id = ?', [status, id], function(err) {
        if (err) resolve({ success: false, error: err.message }); else resolve({ success: true });
      });
    });
  })

  createWindow()
  app.on('activate', function () { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })