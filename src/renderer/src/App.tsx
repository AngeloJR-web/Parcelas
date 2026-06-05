import { useState, useEffect } from 'react'
import './App.css'

interface Card {
  id?: number
  name: string
  closingDate: number
  dueDate: number
  limitTotal: number
}

function App() {
  const [activeView, setActiveView] = useState('compras') 
  
  // --- Estados do Cartão ---
  const [name, setName] = useState('')
  const [closingDate, setClosingDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [limitTotal, setLimitTotal] = useState('')
  const [cards, setCards] = useState<Card[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingCardId, setEditingCardId] = useState<number | null>(null) // NOVO: Controle de Edição

  // --- Estados da Compra ---
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [purchaseCardId, setPurchaseCardId] = useState('')
  const [purchaseDesc, setPurchaseDesc] = useState('')
  const [purchaseTotal, setPurchaseTotal] = useState('')
  const [purchaseInstallments, setPurchaseInstallments] = useState('1')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [purchaseCategory, setPurchaseCategory] = useState('Eletrônicos')
  const [editingPurchaseId, setEditingPurchaseId] = useState<number | null>(null) // NOVO: Controle de Edição

  const [purchases, setPurchases] = useState<any[]>([])
  const [installments, setInstallments] = useState<any[]>([])
  const [toast, setToast] = useState<{show: boolean, msg: string, type: 'success' | 'error'}>({ show: false, msg: '', type: 'success' })

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => { setToast({ show: false, msg: '', type: 'success' }); }, 3000);
  }

  const loadCards = async () => {
    try {
      const loadedCards = await window.api.getCards()
      setCards(loadedCards)
    } catch (error) { console.error(error) }
  }

  const loadPurchases = async () => {
    try {
      const loadedPurchases = await window.api.getPurchases()
      setPurchases(loadedPurchases)
    } catch (error) { console.error(error) }
  }

  const loadInstallments = async () => {
    try {
      const loadedInstallments = await window.api.getInstallments()
      setInstallments(loadedInstallments)
    } catch (error) { console.error(error) }
  }

  useEffect(() => {
    loadCards(); loadPurchases(); loadInstallments();
  }, [])

  // ====================================================================
  // HANDLERS DE CARTÃO (Create & Update)
  // ====================================================================
  const handleOpenAddCardForm = () => {
    setEditingCardId(null);
    setName(''); setClosingDate(''); setDueDate(''); setLimitTotal('');
    setShowForm(true);
  }

  const handleEditCard = (card: Card) => {
    setEditingCardId(card.id!);
    setName(card.name);
    setClosingDate(card.closingDate.toString());
    setDueDate(card.dueDate.toString());
    setLimitTotal(card.limitTotal.toString());
    setShowForm(true);
  }

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newCard = { name, closingDate: Number(closingDate), dueDate: Number(dueDate), limitTotal: Number(limitTotal) }
    
    let result;
    if (editingCardId) {
      result = await window.api.updateCard({ id: editingCardId, ...newCard })
    } else {
      result = await window.api.addCard(newCard)
    }

    if (result.success) {
      setName(''); setClosingDate(''); setDueDate(''); setLimitTotal('');
      setEditingCardId(null);
      setShowForm(false); 
      loadCards(); loadPurchases(); loadInstallments(); // Atualiza em cascata os nomes alterados
      showToast(editingCardId ? "Cartão atualizado!" : "Cartão cadastrado!", "success");
    } else { showToast('Erro ao salvar o cartão!', "error"); }
  }

  const handleDeleteCard = async (id: number) => {
    if (!window.confirm("O cartão será removido, mas compras antigas ficam mantidas.")) return;
    const result = await window.api.deleteCard(id);
    if (result.success) {
      loadCards(); loadPurchases(); loadInstallments(); showToast("Cartão excluído com sucesso!", "success");
    } else { showToast("Erro ao excluir cartão", "error"); }
  }

  // ====================================================================
  // HANDLERS DE COMPRA (Create & Update)
  // ====================================================================
  const handleOpenAddPurchaseModal = () => {
    setEditingPurchaseId(null);
    setPurchaseCardId(''); setPurchaseDesc(''); setPurchaseTotal('');
    setPurchaseInstallments('1'); setPurchaseDate(''); setPurchaseCategory('Eletrônicos');
    setIsPurchaseModalOpen(true);
  }

  const handleEditPurchase = (purchase: any) => {
    setEditingPurchaseId(purchase.id);
    setPurchaseCardId(purchase.cardId.toString());
    setPurchaseDesc(purchase.desc);
    setPurchaseTotal(purchase.total.toString());
    setPurchaseInstallments(purchase.parcelas.toString());
    setPurchaseDate(purchase.date); // Já vem YYYY-MM-DD do SQLite
    setPurchaseCategory(purchase.category || 'Outros');
    setIsPurchaseModalOpen(true);
  }

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!purchaseCardId) { showToast("Selecione um cartão de crédito!", "error"); return; }
    if (!purchaseDesc) { showToast("Digite uma descrição!", "error"); return; }
    if (!purchaseTotal) { showToast("Digite o valor total!", "error"); return; }
    if (!purchaseDate) { showToast("Selecione a data da compra!", "error"); return; }

    const formattedTotal = Number(purchaseTotal.toString().replace(',', '.'));
    if (isNaN(formattedTotal)) { showToast("Valor total inválido!", "error"); return; }

    try {
      const purchaseData = {
        cardId: Number(purchaseCardId), description: purchaseDesc,
        totalAmount: formattedTotal, installmentsCount: Number(purchaseInstallments), 
        purchaseDate: purchaseDate, category: purchaseCategory 
      }
      
      let result;
      if (editingPurchaseId) {
        result = await window.api.updatePurchase({ id: editingPurchaseId, ...purchaseData })
      } else {
        result = await window.api.addPurchase(purchaseData)
      }

      if (result.success) {
        setPurchaseCardId(''); setPurchaseDesc(''); setPurchaseTotal('');
        setPurchaseInstallments('1'); setPurchaseDate(''); setPurchaseCategory('Eletrônicos');
        setEditingPurchaseId(null);
        setIsPurchaseModalOpen(false);
        loadPurchases(); loadInstallments();
        showToast(editingPurchaseId ? "Compra e Faturas atualizadas!" : "Compra registrada!", "success");
      } else { showToast('Erro ao registrar: ' + result.error, "error"); }
    } catch (error) { showToast("Erro crítico", "error"); }
  }

  const handleDeletePurchase = async (id: number) => {
    if (!window.confirm("Excluir esta compra vai deletar TODAS as faturas. Confirmar?")) return;
    const result = await window.api.deletePurchase(id);
    if (result.success) {
      loadPurchases(); loadInstallments(); showToast("Compra apagada!", "success");
    } else { showToast("Erro ao excluir", "error"); }
  }

  const handleTogglePayment = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'Pago' ? 'Pendente' : 'Pago';
    const result = await window.api.updateInstallmentStatus(id, newStatus);
    if (result.success) {
      loadInstallments(); loadPurchases();
      if (newStatus === 'Pago') showToast("Parcela marcada como paga! ✅", "success");
    } else { showToast("Erro ao atualizar.", "error"); }
  }

  // --- Funções Visuais e Matemáticas (Mantidas) ---
  const getCardVisuals = (cardName: string) => {
    const lower = cardName.toLowerCase();
    let bg = 'linear-gradient(135deg, #3f3f46 0%, #18181b 100%)';
    let flag = 'VISA'; 
    if (lower.includes('nubank') || lower.includes('nu')) bg = 'linear-gradient(135deg, #8A05BE 0%, #4A0368 100%)';
    else if (lower.includes('itaú') || lower.includes('itau')) bg = 'linear-gradient(135deg, #EC7000 0%, #FF9900 100%)';
    else if (lower.includes('inter')) bg = 'linear-gradient(135deg, #FF7A00 0%, #E04D00 100%)';
    else if (lower.includes('c6')) bg = 'linear-gradient(135deg, #242424 0%, #050505 100%)';
    else if (lower.includes('santander')) bg = 'linear-gradient(135deg, #CC0000 0%, #8A0000 100%)';
    else if (lower.includes('bradesco')) bg = 'linear-gradient(135deg, #CC092F 0%, #8A0520 100%)';
    else if (lower.includes('brasil') || lower.includes('bb')) bg = 'linear-gradient(135deg, #FCEC0C 0%, #003DA5 100%)';
    else if (lower.includes('caixa')) bg = 'linear-gradient(135deg, #005CA9 0%, #003059 100%)';
    if (lower.includes('master') || lower.includes('mastercard')) flag = 'MASTERCARD';
    else if (lower.includes('elo')) flag = 'ELO';
    return { bg, flag };
  }

  const renderFlagLogo = (flag: string) => {
    if (flag === 'MASTERCARD') return <svg width="40" height="24" viewBox="0 0 40 24"><circle cx="12" cy="12" r="10" fill="#eb001b" opacity="0.9" /><circle cx="28" cy="12" r="10" fill="#f79e1b" opacity="0.9" /></svg>;
    if (flag === 'ELO') return <span style={{ fontSize: '1.4rem', fontWeight: 800, fontStyle: 'italic', letterSpacing: '-1px', color: '#fff' }}>elo</span>;
    return <span style={{ fontSize: '1.4rem', fontWeight: 800, fontStyle: 'italic', color: '#fff' }}>VISA</span>;
  }

  const groupedInstallments = installments.reduce((acc: Record<string, any[]>, curr: any) => {
    const [year, month] = curr.dueDate.split('-');
    const key = `${month}/${year}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {} as Record<string, any[]>);
  
  const monthNames: Record<string, string> = { "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril", "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto", "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro" };

  const currentYear = new Date().getFullYear().toString();
  const monthlyTotals = Array(12).fill(0);
  installments.forEach(item => {
    const [year, month] = item.dueDate.split('-');
    if (year === currentYear) {
      const monthIdx = parseInt(month, 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) monthlyTotals[monthIdx] += item.amount;
    }
  });
  const maxSpendingInYear = Math.max(...monthlyTotals);
  const yScaleMax = maxSpendingInYear > 0 ? maxSpendingInYear : 500;
  const chartPoints = monthlyTotals.map((total, idx) => ({ x: (idx / 11) * 1000, y: 180 - (total / yScaleMax) * 150 }));
  const linePathString = chartPoints.reduce((acc, pt, idx) => idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '');
  const areaPathString = linePathString ? `${linePathString} L 1000 200 L 0 200 Z` : '';

  const categoryColors: Record<string, string> = { 'Eletrônicos': '#5cd685', 'Casa': '#3b82f6', 'Assinaturas': '#ec4899', 'Viagem': '#f59e0b', 'Educação': '#a855f7', 'Outros': '#6b7280' };
  const categoryTotals = purchases.reduce((acc: Record<string, number>, p: any) => {
    const cat = p.category || 'Outros'; acc[cat] = (acc[cat] || 0) + p.total; return acc;
  }, {} as Record<string, number>);
  const grandTotalPurchases: number = Object.values(categoryTotals).reduce((sum: number, t: number) => sum + t, 0);

  let cumulativePercentage = 0;
  const gradientSlices = Object.entries(categoryTotals).map(([cat, amount]: [string, number]) => {
    const percentage = grandTotalPurchases > 0 ? (amount / grandTotalPurchases) * 100 : 0;
    const color = categoryColors[cat] || '#6b7280';
    const start = cumulativePercentage; cumulativePercentage += percentage;
    return `${color} ${start}% ${cumulativePercentage}%`;
  });
  const donutChartStyle = { background: gradientSlices.length > 0 ? `conic-gradient(${gradientSlices.join(', ')})` : '#2a2a2a', width: '220px', height: '220px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', margin: '0 auto' };

  return (
    <div className="app-layout">
      
      <aside className="sidebar">
        <div className="brand"><span className="brand-icon">₽</span> Parcelas</div>
        <ul className="nav-menu">
          <li className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>📋 Dashboard</li>
          <li className={`nav-item ${activeView === 'cartoes' ? 'active' : ''}`} onClick={() => setActiveView('cartoes')}>💳 Meus Cartões</li>
          <li className={`nav-item ${activeView === 'compras' ? 'active' : ''}`} onClick={() => setActiveView('compras')}>🛍️ Compras</li>
          <li className={`nav-item ${activeView === 'parcelas' ? 'active' : ''}`} onClick={() => setActiveView('parcelas')}>⏱️ Próximas Parcelas</li>
          <li className={`nav-item ${activeView === 'relatorios' ? 'active' : ''}`} onClick={() => setActiveView('relatorios')}>⚙️ Relatórios</li>
        </ul>
      </aside>

      <main className="main-content">
        
        {/* ============ DASHBOARD ============ */}
        {activeView === 'dashboard' && (
          <>
            <header className="header"><h1>Dashboard</h1></header>
            <div className="cards-row">
              {cards.map((card) => {
                const visuals = getCardVisuals(card.name)
                return (
                  <div key={card.id} className="bank-card" style={{ background: visuals.bg }}>
                    <div className="card-top">
                      <span>{card.name}</span>
                      <div className="card-top-actions">
                        <button className="btn-edit-icon" onClick={() => { setActiveView('cartoes'); handleEditCard(card); }} title="Editar">✏️</button>
                        <span className="card-brand">{renderFlagLogo(visuals.flag)}</span>
                      </div>
                    </div>
                    <div className="card-bottom">
                      <div>
                        <div className="card-limit-label">Limite Total</div>
                        <div className="card-limit-value">R$ {card.limitTotal.toFixed(2)}</div>
                        <div className="card-date">{String(card.closingDate).padStart(2, '0')}/{String(card.dueDate).padStart(2, '0')}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="bento-panel">
              <div className="panel-header"><h2>Gastos Mensais de {currentYear}</h2><span style={{ color: 'var(--brand-green)', fontSize: '0.85rem', fontWeight: 600 }}>Pico: R$ {maxSpendingInYear.toFixed(2)}</span></div>
              <div className="chart-container">
                <svg className="svg-chart" viewBox="0 0 1000 200" preserveAspectRatio="none">
                  <defs><linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5cd685" stopOpacity="0.4" /><stop offset="100%" stopColor="#5cd685" stopOpacity="0.0" /></linearGradient></defs>
                  <line x1="0" y1="50" x2="1000" y2="50" stroke="#2a2a2a" strokeWidth="1" />
                  <line x1="0" y1="100" x2="1000" y2="100" stroke="#2a2a2a" strokeWidth="1" />
                  <line x1="0" y1="150" x2="1000" y2="150" stroke="#2a2a2a" strokeWidth="1" />
                  {linePathString && (
                    <>
                      <path d={areaPathString} fill="url(#chartGlow)" />
                      <path d={linePathString} fill="none" stroke="#5cd685" strokeWidth="3" />
                    </>
                  )}
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '0.8rem', marginTop: '12px' }}>
                  {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, idx) => (
                    <div key={m} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{m}</span>
                      <span style={{ fontSize: '0.7rem', color: monthlyTotals[idx] > 0 ? 'var(--brand-green)' : '#555' }}>R$ {Math.round(monthlyTotals[idx])}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============ MEUS CARTÕES ============ */}
        {activeView === 'cartoes' && (
          <>
            <div className="search-header"><h1>Meus Cartões</h1></div>
            {showForm && (
              <form className="inline-form" onSubmit={handleCardSubmit} style={{ marginBottom: '20px', borderColor: editingCardId ? '#3b82f6' : 'var(--border-color)' }}>
                <div className="form-group"><label>Banco</label><input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
                <div className="form-group"><label>Fechamento</label><input type="number" className="form-input" min="1" max="31" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} required /></div>
                <div className="form-group"><label>Vencimento</label><input type="number" className="form-input" min="1" max="31" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required /></div>
                <div className="form-group"><label>Limite Total</label><input type="number" className="form-input" step="0.01" value={limitTotal} onChange={(e) => setLimitTotal(e.target.value)} required /></div>
                <button type="submit" className="btn-primary" style={{ backgroundColor: editingCardId ? '#3b82f6' : 'var(--brand-green)' }}>
                  {editingCardId ? 'Atualizar Cartão' : 'Salvar'}
                </button>
              </form>
            )}
            <div className="cards-grid">
              {cards.map((card) => {
                const visuals = getCardVisuals(card.name)
                return (
                  <div key={card.id} className="physical-card-item" style={{ background: visuals.bg }}>
                    <div className="physical-card-top">
                      <div className="card-chip"></div>
                      <div className="physical-card-flags">
                         <button className="btn-edit-icon" style={{color: '#fff'}} onClick={() => handleEditCard(card)}>✏️</button>
                         <button className="btn-delete-icon" style={{color: '#fff'}} onClick={() => handleDeleteCard(card.id!)}>🗑️</button>
                         <span>{card.name.split(' ')[0]}</span>
                      </div>
                    </div>
                    <div className="physical-card-bottom">
                      <div className="physical-card-info">
                        <div className="physical-card-number">**** **** **** {String(card.dueDate).padStart(2, '0')}</div>
                        <div className="physical-card-name">Lim: R$ {card.limitTotal.toFixed(2)}</div>
                      </div>
                      <div>{renderFlagLogo(visuals.flag)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <button className="btn-full-width" onClick={handleOpenAddCardForm}>+ Adicionar Cartão</button>
          </>
        )}

        {/* ============ COMPRAS ============ */}
        {activeView === 'compras' && (
          <>
            <div className="view-header"><h1>Minhas Compras</h1></div>
            <div className="filter-bar"><button className="fab-btn" onClick={handleOpenAddPurchaseModal}>+</button></div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Cartão</th><th>Valor Total</th><th>Parcelas</th><th>Status</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td style={{ color: '#9ca3af' }}>{purchase.date.split('-').reverse().join('/')}</td>
                      <td style={{ fontWeight: 500 }}>{purchase.desc}</td>
                      <td><span className="badge" style={{ backgroundColor: `rgba(255,255,255,0.05)`, color: categoryColors[purchase.category] || '#fff', border: `1px solid ${categoryColors[purchase.category]}30` }}>{purchase.category || 'Outros'}</span></td>
                      <td>{purchase.card}</td>
                      <td>R$ {purchase.total.toFixed(2)}</td>
                      <td>{purchase.parcelas}x</td>
                      <td><span className={`badge ${purchase.status === 'Finalizada' ? 'badge-green' : 'badge-yellow'}`}>{purchase.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn-edit-icon" onClick={() => handleEditPurchase(purchase)}>✏️</button>
                          <button className="btn-delete-icon" onClick={() => handleDeletePurchase(purchase.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ============ PRÓXIMAS PARCELAS ============ */}
        {activeView === 'parcelas' && (
          <>
            <div className="view-header"><h1>Faturas e Previsões</h1></div>
            {Object.keys(groupedInstallments).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px', color: '#9ca3af' }}><p>Nenhuma parcela registrada.</p></div>
            ) : (
              Object.entries(groupedInstallments).map(([monthYearKey, items]: [string, any[]]) => {
                const [monthStr, yearStr] = monthYearKey.split('/');
                const monthName = monthNames[monthStr];
                const totalMonth = items.reduce((sum, item) => sum + item.amount, 0);
                return (
                  <div key={monthYearKey} className="bento-panel" style={{ marginBottom: '30px' }}>
                    <div className="panel-header" style={{ borderBottom: '1px solid #2a2a2a', paddingBottom: '15px' }}>
                      <h2 style={{ color: '#5cd685' }}>Fatura de {monthName} <span style={{ color: '#9ca3af', fontSize: '1rem' }}>{yearStr}</span></h2>
                      <div><span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Total</span><h3>R$ {totalMonth.toFixed(2)}</h3></div>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      {items.map((item) => {
                        const isPaid = item.status === 'Pago';
                        return (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #2a2a2a', alignItems: 'center', opacity: isPaid ? 0.5 : 1, textDecoration: isPaid ? 'line-through' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <input type="checkbox" className="custom-checkbox" checked={isPaid} onChange={() => handleTogglePayment(item.id, item.status)} />
                              <div><strong>{item.desc}</strong><span>{item.card} • Parc {item.installmentNumber} • {item.dueDate.split('-').reverse().join('/')}</span></div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}><span className={`badge ${isPaid ? 'badge-green' : 'badge-yellow'}`}>{item.status}</span><div>R$ {item.amount.toFixed(2)}</div></div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}

        {/* ============ RELATÓRIOS ============ */}
        {activeView === 'relatorios' && (
          <>
            <div className="view-header"><div className="view-title-group"><h1>Inteligência de Categorias</h1></div></div>
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '30px', alignItems: 'start' }}>
              <div className="bento-panel" style={{ textAlign: 'center', padding: '35px 20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '25px', color: 'var(--text-secondary)' }}>Divisão de Despesas</h3>
                <div style={donutChartStyle}>
                  <div style={{ width: '150px', height: '150px', borderRadius: '50%', backgroundColor: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Geral</span>
                    <strong style={{ fontSize: '1.2rem', color: '#fff', marginTop: '4px' }}>R$ {grandTotalPurchases.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
              <div className="bento-panel" style={{ padding: '30px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '20px', borderBottom: '1px solid #2a2a2a', paddingBottom: '15px' }}>Acumulado por Categoria</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {grandTotalPurchases === 0 ? (
                    <p style={{ color: 'var(--text-secondary)' }}>Nenhuma compra registrada.</p>
                  ) : (
                    Object.entries(categoryColors).map(([cat, color]) => {
                      const amount = categoryTotals[cat] || 0;
                      const percentage = grandTotalPurchases > 0 ? (amount / grandTotalPurchases) * 100 : 0;
                      return (
                        <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color }}></div>
                            <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{cat}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', backgroundColor: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '4px' }}>{percentage.toFixed(1)}%</span>
                          </div>
                          <strong style={{ fontSize: '1rem', color: amount > 0 ? '#fff' : 'var(--text-secondary)' }}>R$ {amount.toFixed(2)}</strong>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* MODAL DE COMPRAS */}
      {isPurchaseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <button className="modal-close" onClick={() => setIsPurchaseModalOpen(false)}>✕</button>
            <h2 className="modal-title">{editingPurchaseId ? '✏️ Editar Compra' : 'Nova Compra'}</h2>
            <form className="modal-form" onSubmit={handlePurchaseSubmit}>
              <div className="modal-input-group"><label>Cartão</label><select className="modal-input" value={purchaseCardId} onChange={(e) => setPurchaseCardId(e.target.value)}><option value="" disabled>Selecione...</option>{cards.map(card => (<option key={card.id} value={card.id}>{card.name}</option>))}</select></div>
              <div className="modal-input-group"><label>Descrição</label><input type="text" className="modal-input" value={purchaseDesc} onChange={(e) => setPurchaseDesc(e.target.value)} /></div>
              <div className="modal-input-group"><label>Valor total (R$)</label><input type="text" className="form-input" placeholder="0,00" value={purchaseTotal} onChange={(e) => setPurchaseTotal(e.target.value)} /></div>
              <div className="modal-input-group"><label>Parcelas</label><div className="modal-slider-row"><input type="range" className="modal-slider" min="1" max="48" value={purchaseInstallments} onChange={(e) => setPurchaseInstallments(e.target.value)} /><div className="modal-slider-value">{purchaseInstallments}x</div></div></div>
              <div className="modal-input-group"><label>Data da compra</label><input type="date" className="form-input" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></div>
              
              <div className="modal-input-group">
                <label>Categoria</label>
                <div className="modal-tags">
                  {['Eletrônicos', 'Casa', 'Assinaturas', 'Viagem', 'Educação', 'Outros'].map(cat => {
                    const isSelected = purchaseCategory === cat;
                    return (
                      <span key={cat} className="modal-tag" onClick={() => setPurchaseCategory(cat)} style={isSelected ? { backgroundColor: categoryColors[cat], color: '#000', fontWeight: 600 } : {}}>{cat}</span>
                    )
                  })}
                </div>
              </div>
              <button type="submit" className="modal-btn-submit" style={{ backgroundColor: editingPurchaseId ? '#3b82f6' : 'var(--brand-green)' }}>
                {editingPurchaseId ? 'Atualizar Faturas' : 'Criar Parcelas'}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="toast-container"><div className={`toast toast-${toast.type}`}><span className="toast-icon">{toast.type === 'success' ? '✅' : '⚠️'}</span><span>{toast.msg}</span></div></div>
      )}
    </div>
  )
}

export default App