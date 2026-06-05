import sqlite3 from 'sqlite3';
import { app } from 'electron';
import path from 'path';

// Salva o banco na pasta nativa de dados do usuário (ex: AppData no Windows)
const dbPath = path.join(app.getPath('userData'), 'financas.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
  } else {
    console.log('Banco SQLite conectado com sucesso em:', dbPath);
  }
});

export function initDB() {
  db.serialize(() => {
    // 1. Tabela de Cartões
    db.run(`CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      closingDate INTEGER NOT NULL,
      dueDate INTEGER NOT NULL,
      limitTotal REAL NOT NULL
    )`);

    // 2. Tabela de Compras (Guarda o registro geral da compra)
    db.run(`CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cardId INTEGER NOT NULL,
      description TEXT NOT NULL,
      totalAmount REAL NOT NULL,
      installmentsCount INTEGER NOT NULL,
      purchaseDate TEXT NOT NULL,
      FOREIGN KEY (cardId) REFERENCES cards (id) ON DELETE CASCADE
    )`);

    // 3. Tabela de Parcelas (Guarda cada fatura individual gerada por uma compra)
    db.run(`CREATE TABLE IF NOT EXISTS installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchaseId INTEGER NOT NULL,
      installmentNumber TEXT NOT NULL, -- Armazena no formato "1/10", "2/10", etc.
      amount REAL NOT NULL,
      dueDate TEXT NOT NULL,            -- Data de vencimento dessa parcela específica
      status TEXT NOT NULL DEFAULT 'Pendente', -- 'Pendente' ou 'Pago'
      FOREIGN KEY (purchaseId) REFERENCES purchases (id) ON DELETE CASCADE
    )`);
    
    console.log('Todas as tabelas do banco de dados foram verificadas/criadas com sucesso.');
  });
}

export default db;