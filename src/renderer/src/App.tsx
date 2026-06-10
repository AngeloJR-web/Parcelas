import { useState, useEffect, useRef } from 'react'
import './App.css'

interface Card { id?: number, name: string, closingDate: number, dueDate: number, limitTotal: number }

function App() {
  const [activeView, setActiveView] = useState('perfil') 
  
  // --- NOVO ESTADO: GESTÃO DE TEMA ---
  const [appTheme, setAppTheme] = useState('Escuro')

  const [name, setName] = useState('')
  const [closingDate, setClosingDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [limitTotal, setLimitTotal] = useState('')
  const [cards, setCards] = useState<Card[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingCardId, setEditingCardId] = useState<number | null>(null)

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [purchaseCardId, setPurchaseCardId] = useState('')
  const [purchaseDesc, setPurchaseDesc] = useState('')
  const [purchaseTotal, setPurchaseTotal] = useState('')
  const [purchaseInstallments, setPurchaseInstallments] = useState('1')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [purchaseCategory, setPurchaseCategory] = useState('Eletrônicos')
  const [editingPurchaseId, setEditingPurchaseId] = useState<number | null>(null)

  const [selectedCardFilter, setSelectedCardFilter] = useState<string | null>(null)
  const [overlayCardDetails, setOverlayCardDetails] = useState<Card | null>(null)
  
  const [reportDate, setReportDate] = useState(new Date())

  const [purchases, setPurchases] = useState<any[]>([])
  const [installments, setInstallments] = useState<any[]>([])
  const [toast, setToast] = useState<{show: boolean, msg: string, type: 'success' | 'error'}>({ show: false, msg: '', type: 'success' })

  const carouselRef = useRef<HTMLDivElement>(null)
  const monthPickerRef = useRef<HTMLInputElement>(null)

  // Efeito que injeta a classe light-theme no body da aplicação
  useEffect(() => {
    if (appTheme === 'Claro') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [appTheme]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type }); setTimeout(() => { setToast({ show: false, msg: '', type: 'success' }); }, 3000);
  }

  const loadCards = async () => { try { const res = await window.api.getCards(); setCards(res); } catch (e) { console.error(e) } }
  const loadPurchases = async () => { try { const res = await window.api.getPurchases(); setPurchases(res); } catch (e) { console.error(e) } }
  const loadInstallments = async () => { try { const res = await window.api.getInstallments(); setInstallments(res); } catch (e) { console.error(e) } }

  useEffect(() => { loadCards(); loadPurchases(); loadInstallments(); }, [])

  const handleOpenAddCardForm = () => { setEditingCardId(null); setName(''); setClosingDate(''); setDueDate(''); setLimitTotal(''); setShowForm(!showForm); }
  const handleEditCard = (card: Card) => { setEditingCardId(card.id!); setName(card.name); setClosingDate(card.closingDate.toString()); setDueDate(card.dueDate.toString()); setLimitTotal(card.limitTotal.toString()); setShowForm(true); }

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newCard = { name, closingDate: Number(closingDate), dueDate: Number(dueDate), limitTotal: Number(limitTotal) }
    let result = editingCardId ? await window.api.updateCard({ id: editingCardId, ...newCard }) : await window.api.addCard(newCard);
    if (result.success) { setName(''); setClosingDate(''); setDueDate(''); setLimitTotal(''); setEditingCardId(null); setShowForm(false); loadCards(); loadPurchases(); loadInstallments(); showToast(editingCardId ? "Cartão atualizado!" : "Cartão cadastrado!", "success"); } 
  }

  const handleDeleteCard = async (id: number) => {
    if (!window.confirm("O cartão será removido, mas as compras antigas são mantidas.")) return;
    if ((await window.api.deleteCard(id)).success) { loadCards(); loadPurchases(); loadInstallments(); showToast("Excluído!", "success"); } 
  }

  const scrollCarousel = (dir: 'left' | 'right') => { if(carouselRef.current) { carouselRef.current.scrollBy({ left: dir === 'left' ? -340 : 340, behavior: 'smooth' }); } }
  const handleCardClick = (card: Card) => { setOverlayCardDetails(card); }
  const handleOpenAddPurchaseModal = () => { setEditingPurchaseId(null); setPurchaseCardId(''); setPurchaseDesc(''); setPurchaseTotal(''); setPurchaseInstallments('1'); setPurchaseDate(''); setPurchaseCategory('Eletrônicos'); setIsPurchaseModalOpen(true); }
  const handleEditPurchase = (p: any) => { setEditingPurchaseId(p.id); setPurchaseCardId(p.cardId.toString()); setPurchaseDesc(p.desc); setPurchaseTotal(p.total.toString()); setPurchaseInstallments(p.parcelas.toString()); setPurchaseDate(p.date); setPurchaseCategory(p.category || 'Outros'); setIsPurchaseModalOpen(true); }

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!purchaseCardId || !purchaseDesc || !purchaseTotal || !purchaseDate) return showToast("Preencha tudo!", "error");
    const formattedTotal = Number(purchaseTotal.toString().replace(',', '.'));
    if (isNaN(formattedTotal)) return showToast("Valor inválido!", "error");
    const pData = { cardId: Number(purchaseCardId), description: purchaseDesc, totalAmount: formattedTotal, installmentsCount: Number(purchaseInstallments), purchaseDate: purchaseDate, category: purchaseCategory }
    let result = editingPurchaseId ? await window.api.updatePurchase({ id: editingPurchaseId, ...pData }) : await window.api.addPurchase(pData);
    if (result.success) { setPurchaseCardId(''); setPurchaseDesc(''); setPurchaseTotal(''); setPurchaseInstallments('1'); setPurchaseDate(''); setEditingPurchaseId(null); setIsPurchaseModalOpen(false); loadPurchases(); loadInstallments(); showToast("Sucesso!", "success"); }
  }

  const handleDeletePurchase = async (id: number) => {
    if (!window.confirm("Excluir esta compra vai deletar as faturas. Confirmar?")) return;
    if ((await window.api.deletePurchase(id)).success) { loadPurchases(); loadInstallments(); showToast("Apagada!", "success"); }
  }

  const handleTogglePayment = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'Pago' ? 'Pendente' : 'Pago';
    if ((await window.api.updateInstallmentStatus(id, newStatus)).success) { loadInstallments(); loadPurchases(); if (newStatus === 'Pago') showToast("Parcela paga! ✅", "success"); }
  }

  const getCardVisuals = (cardName: string) => {
    const lower = cardName.toLowerCase(); let bg = 'linear-gradient(135deg, #3f3f46 0%, #18181b 100%)'; let flag = 'VISA'; 
    if (lower.includes('nubank') || lower.includes('nu')) bg = 'linear-gradient(135deg, #8A05BE 0%, #4A0368 100%)';
    else if (lower.includes('itaú') || lower.includes('itau')) bg = 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)';
    else if (lower.includes('inter')) bg = 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)'; 
    else if (lower.includes('santander')) bg = 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'; 
    else if (lower.includes('mercado')) bg = 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)'; 
    else if (lower.includes('c6')) bg = 'linear-gradient(135deg, #242424 0%, #050505 100%)';
    else if (lower.includes('bradesco')) bg = 'linear-gradient(135deg, #CC092F 0%, #8A0520 100%)';
    else if (lower.includes('brasil') || lower.includes('bb')) bg = 'linear-gradient(135deg, #FCEC0C 0%, #003DA5 100%)';
    else if (lower.includes('caixa')) bg = 'linear-gradient(135deg, #005CA9 0%, #003059 100%)';
    if (lower.includes('master') || lower.includes('mastercard')) flag = 'MASTERCARD'; else if (lower.includes('elo')) flag = 'ELO';
    return { bg, flag };
  }
  const renderFlagLogo = (flag: string) => {
    if (flag === 'MASTERCARD') return <svg width="40" height="24" viewBox="0 0 40 24"><circle cx="12" cy="12" r="10" fill="#eb001b" opacity="0.9" /><circle cx="28" cy="12" r="10" fill="#f79e1b" opacity="0.9" /></svg>;
    if (flag === 'ELO') return <span style={{ fontSize: '1.4rem', fontWeight: 800, fontStyle: 'italic', letterSpacing: '-1px', color: 'var(--text-main)' }}>elo</span>; return <span style={{ fontSize: '1.4rem', fontWeight: 800, fontStyle: 'italic', color: 'var(--text-main)' }}>VISA</span>;
  }

  const monthNames: Record<string, string> = { "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril", "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto", "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro" };
  const currentYear = new Date().getFullYear().toString(); const monthlyTotals = Array(12).fill(0);
  installments.forEach(item => { const [y, m] = item.dueDate.split('-'); if (y === currentYear) { const monthIdx = parseInt(m, 10) - 1; if (monthIdx >= 0 && monthIdx < 12) monthlyTotals[monthIdx] += item.amount; } });
  const maxSpendingInYear = Math.max(...monthlyTotals); const yScaleMax = maxSpendingInYear > 0 ? maxSpendingInYear : 500;
  const chartPoints = monthlyTotals.map((total, idx) => ({ x: (idx / 11) * 1000, y: 180 - (total / yScaleMax) * 150 }));
  const linePathString = chartPoints.reduce((acc, pt, idx) => idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '');
  const areaPathString = linePathString ? `${linePathString} L 1000 200 L 0 200 Z` : '';
  
  const categoryColors: Record<string, string> = { 'Eletrônicos': '#5cd685', 'Casa': '#3b82f6', 'Assinaturas': '#ec4899', 'Viagem': '#f59e0b', 'Educação': '#a855f7', 'Outros': '#6b7280' };

  let overlayStats = { total: 0, pagas: 0, totalCount: 0, proximaData: '--/--' };
  let overlayInstallments: any[] = [];
  if (overlayCardDetails) {
    overlayInstallments = installments.filter(i => i.card === overlayCardDetails.name);
    overlayStats.total = overlayInstallments.reduce((sum, i) => sum + i.amount, 0);
    overlayStats.pagas = overlayInstallments.filter(i => i.status === 'Pago').length;
    overlayStats.totalCount = overlayInstallments.length;
    const pendentes = overlayInstallments.filter(i => i.status !== 'Pago').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    if (pendentes.length > 0) { const [, m, d] = pendentes[0].dueDate.split('-'); overlayStats.proximaData = `${d}/${m}`; }
  }

  const glowColors = ['#5cd685', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4'];
  const filteredInstallments = selectedCardFilter ? installments.filter(item => item.card === selectedCardFilter) : installments;
  const pendingInstallments = filteredInstallments.filter(i => i.status !== 'Pago');
  const nextTotal = pendingInstallments.reduce((sum, i) => sum + i.amount, 0);
  const nextCount = pendingInstallments.length;
  const sortedInstallments = [...filteredInstallments].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const totalCards = cards.length;
  const totalLimitAll = cards.reduce((acc, c) => acc + c.limitTotal, 0);
  const pendingPurchasesTotal = installments.filter(i => i.status !== 'Pago').reduce((acc, i) => acc + i.amount, 0);
  const pendingInstallmentsCount = installments.filter(i => i.status !== 'Pago').length;

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const purchasesThisMonth = purchases.filter(p => p.date && p.date.startsWith(currentMonthStr));
  const totalPurchasesThisMonthCount = purchasesThisMonth.length;
  const totalPurchasesThisMonthValue = purchasesThisMonth.reduce((sum, p) => sum + p.total, 0);

  const thirtyDaysFromNow = new Date(today); thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const valueToPayNext30Days = pendingInstallments.filter(i => { const d = new Date(i.dueDate); return d >= today && d <= thirtyDaysFromNow; }).reduce((sum, i) => sum + i.amount, 0);

  // Matemática Aba Relatórios
  const reportMonthStr = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
  const purchasesReportMonth = purchases.filter(p => p.date && p.date.startsWith(reportMonthStr));
  const totalPurchasesReportCount = purchasesReportMonth.length;
  const totalPurchasesReportValue = purchasesReportMonth.reduce((sum, p) => sum + p.total, 0);

  const prevReportDate = new Date(reportDate.getFullYear(), reportDate.getMonth() - 1, 1);
  const prevReportStr = `${prevReportDate.getFullYear()}-${String(prevReportDate.getMonth() + 1).padStart(2, '0')}`;
  const purchasesPrevReportMonth = purchases.filter(p => p.date && p.date.startsWith(prevReportStr));
  const totalPrevReportValue = purchasesPrevReportMonth.reduce((sum, p) => sum + p.total, 0);

  let trend = 0;
  if (totalPrevReportValue > 0) trend = ((totalPurchasesReportValue - totalPrevReportValue) / totalPrevReportValue) * 100;
  else if (totalPurchasesReportValue > 0) trend = 100;

  const trendText = trend >= 0 ? `▲ ${Math.abs(trend).toFixed(0)}%` : `▼ ${Math.abs(trend).toFixed(0)}%`;
  const trendColor = trend >= 0 ? 'var(--brand-green)' : '#ef4444';
  const trendBg = trend >= 0 ? 'rgba(92, 214, 133, 0.15)' : 'rgba(239, 68, 68, 0.15)';
  const trendMessage = trend >= 0 ? `Seus gastos estão ${Math.abs(trend).toFixed(0)}% maiores que no mês anterior.` : `Seus gastos estão ${Math.abs(trend).toFixed(0)}% menores que no mês anterior.`;

  const categoryTotalsReport = purchasesReportMonth.reduce((acc: Record<string, number>, p: any) => { const cat = p.category || 'Outros'; acc[cat] = (acc[cat] || 0) + p.total; return acc; }, {} as Record<string, number>);
  
  let topCatName = '-'; let topCatAmount = 0;
  Object.entries(categoryTotalsReport).forEach(([cat, amount]) => { if (amount > topCatAmount) { topCatAmount = amount; topCatName = cat; } });
  const topCatPercentage = totalPurchasesReportValue > 0 ? (topCatAmount / totalPurchasesReportValue) * 100 : 0;
  
  const activeCategoriesCount = Object.keys(categoryTotalsReport).length;
  const averageTicket = totalPurchasesReportCount > 0 ? totalPurchasesReportValue / totalPurchasesReportCount : 0;

  let cumulativePercentageReport = 0;
  const gradientSlicesReport = Object.entries(categoryTotalsReport).map(([cat, amount]: [string, number]) => { 
    const percentage = totalPurchasesReportValue > 0 ? (amount / totalPurchasesReportValue) * 100 : 0; 
    const color = categoryColors[cat] || '#6b7280'; const start = cumulativePercentageReport; cumulativePercentageReport += percentage; 
    return `${color} ${start}% ${cumulativePercentageReport}%`; 
  });
  const donutChartStyleReport = { background: gradientSlicesReport.length > 0 ? `conic-gradient(${gradientSlicesReport.join(', ')})` : 'var(--border-color)', width: '240px', height: '240px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' };

  const renderIcon = (category: string) => {
    switch (category) {
      case 'Casa': return ( <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg> );
      case 'Eletrônicos': return ( <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm-5 19.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM17 17H7V5h10v12z"/></svg> );
      case 'Assinaturas': return ( <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg> );
      case 'Viagem': return ( <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg> );
      case 'Educação': return ( <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg> );
      case 'Outros': default: return ( <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg> );
    }
  };

  return (
    <div className="app-layout">
      
      <aside className="sidebar">
        <div className="brand"><span className="brand-icon">₽</span> Parcelas</div>
        <ul className="nav-menu">
          <li className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>📋 Dashboard</li>
          <li className={`nav-item ${activeView === 'cartoes' ? 'active' : ''}`} onClick={() => { setActiveView('cartoes'); setSelectedCardFilter(null); }}>💳 Meus Cartões</li>
          <li className={`nav-item ${activeView === 'compras' ? 'active' : ''}`} onClick={() => setActiveView('compras')}>🛍️ Compras</li>
          <li className={`nav-item ${activeView === 'parcelas' ? 'active' : ''}`} onClick={() => { setActiveView('parcelas'); setSelectedCardFilter(null); }}>⏱️ Próximas Parcelas</li>
          <li className={`nav-item ${activeView === 'relatorios' ? 'active' : ''}`} onClick={() => setActiveView('relatorios')}>⚙️ Relatórios</li>
        </ul>
        <div className={`sidebar-profile ${activeView === 'perfil' || activeView === 'editar_perfil' ? 'active' : ''}`} onClick={() => setActiveView('perfil')}>
          <div className="profile-avatar">AO</div>
          <div className="profile-info"><span className="profile-name">Angelo O.</span><span className="profile-link">Ver perfil</span></div>
        </div>
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
                  <div key={card.id} className="bank-card" style={{ background: visuals.bg }} onClick={() => handleCardClick(card)}>
                    <div className="card-top"><span>{card.name}</span><div className="card-top-actions"><button className="btn-edit-icon" onClick={(e) => { e.stopPropagation(); setActiveView('cartoes'); handleEditCard(card); }}>✏️</button><span className="card-brand">{renderFlagLogo(visuals.flag)}</span></div></div>
                    <div className="card-bottom"><div><div className="card-limit-label">Limite Total</div><div className="card-limit-value">R$ {card.limitTotal.toFixed(2)}</div><div className="card-date">{String(card.closingDate).padStart(2, '0')}/{String(card.dueDate).padStart(2, '0')}</div></div></div>
                  </div>
                )
              })}
            </div>
            <div className="bento-panel">
              <div className="panel-header"><h2>Gastos Mensais de {currentYear}</h2><span style={{ color: 'var(--brand-green)', fontSize: '0.85rem', fontWeight: 600 }}>Pico: R$ {maxSpendingInYear.toFixed(2)}</span></div>
              <div className="chart-container">
                <svg className="svg-chart" viewBox="0 0 1000 200" preserveAspectRatio="none">
                  <defs><linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5cd685" stopOpacity="0.4" /><stop offset="100%" stopColor="#5cd685" stopOpacity="0.0" /></linearGradient></defs>
                  <line x1="0" y1="50" x2="1000" y2="50" stroke="#26262a" strokeWidth="1" /><line x1="0" y1="100" x2="1000" y2="100" stroke="#26262a" strokeWidth="1" /><line x1="0" y1="150" x2="1000" y2="150" stroke="#26262a" strokeWidth="1" />
                  {linePathString && ( <><path d={areaPathString} fill="url(#chartGlow)" /><path d={linePathString} fill="none" stroke="#5cd685" strokeWidth="3" /></> )}
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '12px' }}>{['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, idx) => (<div key={m} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px' }}><span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{m}</span><span style={{ fontSize: '0.7rem', color: monthlyTotals[idx] > 0 ? 'var(--brand-green)' : '#555' }}>R$ {Math.round(monthlyTotals[idx])}</span></div>))}</div>
              </div>
            </div>
          </>
        )}

        {/* ============ MEUS CARTÕES ============ */}
        {activeView === 'cartoes' && (
          <>
            <div className="cards-view-header">
              <div className="view-title-block"><h1>Meus Cartões</h1><p>Gerencie seus cartões e acompanhe seus limites</p></div>
              <button className="btn-outline-green" style={{color: '#a855f7', borderColor: 'rgba(168, 85, 247, 0.3)', background: 'rgba(168, 85, 247, 0.05)'}} onClick={handleOpenAddCardForm}>⚙️ Gerenciar cartões</button>
            </div>
            {showForm && (
              <form className="inline-form" onSubmit={handleCardSubmit} style={{ marginBottom: '30px', borderColor: editingCardId ? '#a855f7' : 'var(--border-color)' }}>
                <div className="form-group"><label>Instituição</label><input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
                <div className="form-group"><label>Fechamento</label><input type="number" className="form-input" min="1" max="31" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} required /></div>
                <div className="form-group"><label>Vencimento</label><input type="number" className="form-input" min="1" max="31" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required /></div>
                <div className="form-group"><label>Limite Total</label><input type="number" className="form-input" step="0.01" value={limitTotal} onChange={(e) => setLimitTotal(e.target.value)} required /></div>
                <button type="submit" className="btn-primary" style={{ backgroundColor: editingCardId ? '#a855f7' : 'var(--brand-green)', color: editingCardId ? '#fff' : '#000' }}>{editingCardId ? 'Atualizar' : 'Salvar'}</button>
              </form>
            )}
            <div className="carousel-wrapper">
              <button className="carousel-btn" onClick={() => scrollCarousel('left')}>❮</button>
              <div className="cards-carousel" ref={carouselRef}>
                {cards.map((card) => {
                  const visuals = getCardVisuals(card.name)
                  return (
                    <div key={card.id} className="sleek-physical-card" style={{ background: visuals.bg }} onClick={() => handleCardClick(card)}>
                      <div className="card-top-row">
                        <div className="card-chip"></div>
                        <div className="card-actions-mini"><button className="mini-action-btn" onClick={(e) => { e.stopPropagation(); handleEditCard(card); }}>✏️</button><button className="mini-action-btn" onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id!); }}>🗑️</button><span style={{ fontSize: '1rem', fontWeight: 800, fontStyle: 'italic', marginLeft: '8px' }}>{card.name.split(' ')[0]}</span></div>
                      </div>
                      <div className="card-middle-row">**** **** **** {String(card.dueDate).padStart(2, '0')}</div>
                      <div className="card-bottom-row"><div className="card-limit-block"><span className="card-limit-label">Limite disponível</span><span className="card-limit-val">R$ {card.limitTotal.toFixed(2)}</span></div><div>{renderFlagLogo(visuals.flag)}</div></div>
                    </div>
                  )
                })}
              </div>
              <button className="carousel-btn" onClick={() => scrollCarousel('right')}>❯</button>
            </div>
            <div className="big-add-card" onClick={handleOpenAddCardForm}><div className="add-icon-circle">+</div><span className="big-add-title">Adicionar Cartão Dinâmico</span><span className="big-add-subtitle">Adicione cartões para acompanhar suas compras e parcelas</span></div>
            <div className="stats-bar">
              <div className="stat-item"><div className="stat-icon" style={{ background: 'rgba(92, 214, 133, 0.1)', color: '#5cd685' }}>💳</div><div className="stat-info"><span className="stat-label">Total de cartões</span><span className="stat-value">{totalCards} cartões</span></div></div>
              <div className="stat-item"><div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>💰</div><div className="stat-info"><span className="stat-label">Limite total</span><span className="stat-value">R$ {totalLimitAll.toFixed(2)}</span></div></div>
              <div className="stat-item"><div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>🛍️</div><div className="stat-info"><span className="stat-label">Compras em aberto</span><span className="stat-value">R$ {pendingPurchasesTotal.toFixed(2)}</span></div></div>
              <div className="stat-item"><div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>📅</div><div className="stat-info"><span className="stat-label">Próximas parcelas</span><span className="stat-value">{pendingInstallmentsCount} parcelas</span></div></div>
            </div>
          </>
        )}

        {/* ============ COMPRAS ============ */}
        {activeView === 'compras' && (
          <>
            <div className="view-header">
              <div className="view-title-block"><h1>Minhas Compras</h1><p>Acompanhe todas as suas compras e parcelas.</p></div>
              <button className="btn-outline-green" onClick={handleOpenAddPurchaseModal}>+ Nova Compra</button>
            </div>
            <div className="purchases-stats-row">
              <div className="purchase-stat-card"><div className="p-stat-icon" style={{ background: 'rgba(92, 214, 133, 0.1)', color: '#5cd685' }}>🛍️</div><div className="p-stat-info"><span className="p-stat-label">Total de compras</span><span className="p-stat-value">{totalPurchasesThisMonthCount}</span><span className="p-stat-sub">Este mês</span></div></div>
              <div className="purchase-stat-card"><div className="p-stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>💳</div><div className="p-stat-info"><span className="p-stat-label">Valor total</span><span className="p-stat-value">R$ {totalPurchasesThisMonthValue.toFixed(2)}</span><span className="p-stat-sub">Este mês</span></div></div>
              <div className="purchase-stat-card"><div className="p-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>📅</div><div className="p-stat-info"><span className="p-stat-label">Parcelas ativas</span><span className="p-stat-value">{pendingInstallmentsCount}</span><span className="p-stat-sub">Total</span></div></div>
              <div className="purchase-stat-card"><div className="p-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>✅</div><div className="p-stat-info"><span className="p-stat-label">Valor a pagar</span><span className="p-stat-value">R$ {valueToPayNext30Days.toFixed(2)}</span><span className="p-stat-sub">Próximos 30 dias</span></div></div>
            </div>

            {purchases.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">🛍️</div><h3>Novas compras aparecerão aqui</h3><p>Adicione uma nova compra para começar</p></div>
            ) : (
              <div className="premium-table-container">
                <table className="premium-table">
                  <thead><tr><th>Data ↕</th><th>Descrição</th><th>Categoria</th><th>Cartão</th><th>Valor Total</th><th>Parcelas</th><th>Status</th><th>Ações</th></tr></thead>
                  <tbody>
                    {purchases.map((purchase) => {
                      const catColor = categoryColors[purchase.category] || '#6b7280'; const isAtiva = purchase.status === 'Ativa';
                      return (
                        <tr key={purchase.id}>
                          <td><span style={{color: 'var(--text-secondary)', marginRight: '6px'}}>📅</span> {purchase.date.split('-').reverse().join('/')}</td>
                          <td style={{ fontWeight: 600 }}>{purchase.desc}</td>
                          <td><div className="badge-dot" style={{ backgroundColor: `${catColor}15`, color: catColor }}>{purchase.category || 'Outros'} <span className="dot" style={{ backgroundColor: catColor }}></span></div></td>
                          <td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '1rem' }}>{purchase.card.toLowerCase().includes('santander') ? '🔴' : '💳'}</span> {purchase.card.split(' ')[0]} <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>••••</span></div></td>
                          <td style={{ fontWeight: 600 }}>R$ {purchase.total.toFixed(2)}</td>
                          <td><div className="parcela-cell"><span className="parcela-badge">{purchase.parcelas}x</span><span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>R$ {(purchase.total / purchase.parcelas).toFixed(2)}</span></div></td>
                          <td><div className="badge-dot" style={{ backgroundColor: isAtiva ? 'rgba(92, 214, 133, 0.15)' : 'rgba(107, 114, 128, 0.15)', color: isAtiva ? '#5cd685' : 'var(--text-secondary)' }}>{purchase.status} <span className="dot" style={{ backgroundColor: isAtiva ? '#5cd685' : 'var(--text-secondary)' }}></span></div></td>
                          <td><div className="action-buttons-group"><button className="action-btn-outline action-btn-edit" onClick={() => handleEditPurchase(purchase)}>✏️</button><button className="action-btn-outline action-btn-delete" onClick={() => handleDeletePurchase(purchase.id)}>🗑️</button></div></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="invoice-hint"><div className="invoice-hint-icon">ℹ</div>Dica: Mantenha suas compras organizadas para controlar melhor seus gastos.</div>
          </>
        )}

        {/* ============ PRÓXIMAS PARCELAS ============ */}
        {activeView === 'parcelas' && (
          <>
            <div className="invoice-header-top">
              <div><h1><span style={{background: 'rgba(168, 85, 247, 0.15)', padding: '8px', borderRadius: '10px', display: 'flex', color: '#a855f7'}}>📅</span> Próximas Parcelas</h1><p>Acompanhe suas próximas cobranças em tempo real</p></div>
              <div className="invoice-top-widget"><div className="widget-icon-box">💳</div><div><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Próximo</span><h3 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '2px 0' }}>R$ {nextTotal.toFixed(2)}</h3><p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{nextCount} parcelas pendentes</p></div></div>
            </div>
            <div>
              {sortedInstallments.length === 0 ? ( <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}><p>Nenhuma fatura registrada neste momento.</p></div> ) : (
                sortedInstallments.map((item) => {
                  const [y, m, d] = item.dueDate.split('-'); const monthAbbr = monthNames[m].substring(0, 3).toUpperCase();
                  const glowColor = glowColors[parseInt(m) % glowColors.length]; const isPaid = item.status === 'Pago';
                  return (
                    <div key={item.id} className="sleek-invoice-card" onClick={() => handleTogglePayment(item.id, item.status)} style={{ opacity: isPaid ? 0.6 : 1 }}>
                      <div className="sleek-card-left" style={{ backgroundColor: `${glowColor}15`, borderLeftColor: glowColor }}><span style={{ color: glowColor, fontWeight: 800, fontSize: '1.2rem', marginTop: '4px', letterSpacing: '1px' }}>{monthAbbr}</span><span style={{ color: glowColor, fontSize: '0.8rem', opacity: 0.8 }}>{y}</span></div>
                      <div className="sleek-card-middle"><h3>Fatura de <span style={{ color: glowColor }}>{monthNames[m]}</span> {y}</h3><div className="detail-row"><span>💳</span> {item.card} • Parc {item.installmentNumber} • <span style={{ color: 'var(--text-main)' }}>{item.desc}</span></div><div className="detail-row"><span>📅</span> Vencimento: {d}/{m}/{y}</div></div>
                      <div className="sleek-card-right"><div className="sleek-status-badge" style={{ backgroundColor: isPaid ? 'rgba(92, 214, 133, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: isPaid ? '#5cd685' : '#3b82f6' }}><span className="dot" style={{ backgroundColor: isPaid ? '#5cd685' : '#3b82f6' }}></span>{item.status}</div><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '10px' }}><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total</span><strong style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)' }}>R$ {item.amount.toFixed(2)}</strong></div></div>
                      <div className="sleek-card-arrow"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg></div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="invoice-hint"><div className="invoice-hint-icon">ℹ</div>Dica: Clique sobre o cartão da fatura para marcar a parcela como paga.</div>
          </>
        )}

        {/* ============ RELATÓRIOS ============ */}
        {activeView === 'relatorios' && (
          <>
            <div className="view-header">
              <div className="view-title-block">
                <h1>Inteligência de Categorias <span className="info-icon-small">i</span></h1>
                <p>Análise inteligente dos seus gastos por categoria.</p>
              </div>
              <div className="date-picker-mock" onClick={() => monthPickerRef.current?.showPicker()} style={{ position: 'relative' }}>
                📅 {reportMonthStr === currentMonthStr ? `Este mês (${monthNames[String(reportDate.getMonth() + 1).padStart(2, '0')]}/${reportDate.getFullYear()})` : `${monthNames[String(reportDate.getMonth() + 1).padStart(2, '0')]} ${reportDate.getFullYear()}`} ⌄
                <input 
                  ref={monthPickerRef} type="month" value={reportMonthStr}
                  onChange={(e) => { if(e.target.value) { const [y, m] = e.target.value.split('-'); setReportDate(new Date(parseInt(y), parseInt(m) - 1, 1)); } }}
                  style={{ position: 'absolute', top: '50%', left: '50%', width: 0, height: 0, opacity: 0, border: 'none', padding: 0, pointerEvents: 'none' }}
                />
              </div>
            </div>

            <div className="reports-grid">
              <div className="reports-panel">
                <div className="reports-panel-header">
                  <h3>Distribuição de Despesas</h3>
                  <span style={{color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem'}}>⋮</span>
                </div>
                
                <div className="donut-container">
                  <div style={donutChartStyleReport}>
                    <div style={{ width: '170px', height: '170px', borderRadius: '50%', backgroundColor: 'var(--bg-panel)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Total Geral</span>
                      <strong style={{ fontSize: '1.5rem', color: 'var(--text-main)', margin: '4px 0' }}>R$ {totalPurchasesReportValue.toFixed(2)}</strong>
                      <div style={{ backgroundColor: trendBg, color: trendColor, padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {trendText} vs mês anterior
                      </div>
                    </div>
                  </div>
                  <div className="donut-hint-box"><div className="donut-hint-icon">📊</div><span className="donut-hint-text">{trendMessage}</span></div>
                </div>
              </div>

              <div className="reports-panel">
                <div className="reports-panel-header">
                  <h3><span className="icon-title">📈</span> Acumulado por Categoria</h3>
                  <a className="r-link">Ver detalhes {'›'}</a>
                </div>

                <div className="category-list-wrapper">
                  {Object.entries(categoryColors).map(([cat, color]) => {
                    const amount = categoryTotalsReport[cat] || 0;
                    const percentage = totalPurchasesReportValue > 0 ? (amount / totalPurchasesReportValue) * 100 : 0;
                    
                    return (
                      <div key={cat} className="cat-list-row">
                        <div className="cat-icon-box" style={{ background: `${color}15`, color: color }}>{renderIcon(cat)}</div>
                        <div className="cat-middle">
                          <span className="cat-middle-title">{cat}</span>
                          <div className="progress-bg"><div className="progress-fill" style={{ width: `${percentage}%`, backgroundColor: color }}></div></div>
                        </div>
                        <div className="cat-right">
                          <span className="cat-pct" style={{ color: amount > 0 ? color : 'var(--text-secondary)' }}>{percentage.toFixed(1)}%</span>
                          <span className="cat-val">{amount > 0 ? `R$ ${amount.toFixed(2)}` : 'R$ 0,00'}</span>
                          <span className="cat-arrow">›</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="reports-bottom-stats">
              <div className="r-stat-card"><div className="r-stat-icon" style={{ background: 'rgba(92, 214, 133, 0.1)', color: '#5cd685' }}>💳</div><div className="r-stat-info"><span className="r-label">Maior categoria</span><span className="r-value">{topCatName}</span><span className="r-sub">{topCatPercentage.toFixed(0)}% do total</span></div></div>
              <div className="r-stat-card"><div className="r-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>🥧</div><div className="r-stat-info"><span className="r-label">Total de categorias</span><span className="r-value">{activeCategoriesCount}</span><span className="r-sub">ativas</span></div></div>
              <div className="r-stat-card"><div className="r-stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>📈</div><div className="r-stat-info"><span className="r-label">Ticket médio</span><span className="r-value">R$ {averageTicket.toFixed(2)}</span><span className="r-sub">por compra</span></div></div>
              <div className="r-stat-card"><div className="r-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>📅</div><div className="r-stat-info"><span className="r-label">Período analisado</span><span className="r-value">{monthNames[String(reportDate.getMonth() + 1).padStart(2, '0')]}/{reportDate.getFullYear()}</span><span className="r-sub">01/{String(reportDate.getMonth() + 1).padStart(2, '0')} a {new Date(reportDate.getFullYear(), reportDate.getMonth() + 1, 0).getDate()}/{String(reportDate.getMonth() + 1).padStart(2, '0')}</span></div></div>
            </div>
          </>
        )}

        {/* ============ MEU PERFIL (LEITURA) ============ */}
        {activeView === 'perfil' && (
          <>
            <div className="profile-header-top">
              <div>
                <h1>Meu Perfil <span className="info-icon-small" style={{width: 24, height: 24}}>👤</span></h1>
                <p>Gerencie suas informações e preferências</p>
              </div>
              <button className="btn-edit-profile" onClick={() => setActiveView('editar_perfil')}>✏️ Editar perfil</button>
            </div>

            <div className="profile-layout-grid">
              <div className="profile-main-card">
                <div className="profile-avatar-large-container">
                  <div className="profile-avatar-large">AO<div className="edit-avatar-badge" onClick={() => setActiveView('editar_perfil')}>✏️</div></div>
                  <h2>Angelo O.</h2>
                  <div className="status-badge"><span className="dot"></span> Conta ativa</div>
                </div>

                <div className="profile-details-list">
                  <div className="p-detail-item"><div className="p-detail-left"><span>📧</span> angelo.o@email.com</div></div>
                  <div className="p-detail-item"><div className="p-detail-left"><span>📅</span> Membro desde</div><div className="p-detail-right">Maio/2026</div></div>
                  <div className="p-detail-item"><div className="p-detail-left"><span>☀️</span> Tema preferido</div><div className="p-detail-right">{appTheme}</div></div>
                  <div className="p-detail-item"><div className="p-detail-left"><span>🔔</span> Notificações</div><div className="p-detail-right">Ativadas</div></div>
                </div>

                <div className="profile-security-box">
                  <div className="p-sec-header"><div className="p-sec-icon">🔒</div><div><div className="p-sec-title">Segurança da conta</div><div className="p-sec-subtitle">Suas informações estão protegidas</div></div></div>
                  <div style={{ marginTop: '5px' }}>
                    <div className="p-sec-link"><span>🛡️ Alterar senha</span> <span>›</span></div>
                    <div className="p-sec-link"><span>💻 Sessões ativas</span> <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><span style={{background: 'rgba(128,128,128,0.1)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', color: 'var(--text-main)'}}>2</span> ›</span></div>
                  </div>
                </div>
              </div>

              <div className="profile-right-column">
                <div>
                  <h3 className="profile-section-title">Resumo da sua conta</h3>
                  <div className="p-summary-grid">
                    <div className="p-summary-card"><div className="p-s-icon" style={{ background: 'rgba(92, 214, 133, 0.1)', color: '#5cd685' }}>💳</div><span className="p-s-value">{totalCards}</span><span className="p-s-label">Cartões cadastrados</span><span className="p-s-sub">Ativos</span></div>
                    <div className="p-summary-card"><div className="p-s-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>🛍️</div><span className="p-s-value">{totalPurchasesThisMonthCount}</span><span className="p-s-label">Compras registradas</span><span className="p-s-sub">Este mês</span></div>
                    <div className="p-summary-card"><div className="p-s-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>📅</div><span className="p-s-value">{pendingInstallmentsCount}</span><span className="p-s-label">Parcelas a vencer</span><span className="p-s-sub">Próximos 30 dias</span></div>
                    <div className="p-summary-card"><div className="p-s-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>📈</div><span className="p-s-value">R$ {valueToPayNext30Days.toFixed(2)}</span><span className="p-s-label">Total a pagar</span><span className="p-s-sub">Próximos 30 dias</span></div>
                  </div>
                </div>

                <div className="p-middle-grid">
                  <div className="p-sub-panel">
                    <div className="p-sub-header"><h3>Preferências</h3></div>
                    <div>
                      <div className="pref-list-item" onClick={() => setActiveView('editar_perfil')} style={{cursor: 'pointer'}}><div className="pref-left"><div className="pref-icon-box" style={{background: 'rgba(92, 214, 133, 0.1)', color: '#5cd685'}}>💲</div><div className="pref-text-box"><span className="pref-title">Moeda padrão</span><span className="pref-sub">Real (R$)</span></div></div><div className="pref-right">›</div></div>
                      <div className="pref-list-item" onClick={() => setActiveView('editar_perfil')} style={{cursor: 'pointer'}}><div className="pref-left"><div className="pref-icon-box" style={{background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6'}}>🌐</div><div className="pref-text-box"><span className="pref-title">Idioma</span><span className="pref-sub">Português (Brasil)</span></div></div><div className="pref-right">›</div></div>
                      <div className="pref-list-item" onClick={() => setActiveView('editar_perfil')} style={{cursor: 'pointer'}}><div className="pref-left"><div className="pref-icon-box" style={{background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7'}}>👁️</div><div className="pref-text-box"><span className="pref-title">Exibir valores</span><span className="pref-sub">Mostrar sempre</span></div></div><div className="pref-right">›</div></div>
                      <div className="pref-list-item"><div className="pref-left"><div className="pref-icon-box" style={{background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b'}}>☁️</div><div className="pref-text-box"><span className="pref-title">Backup de dados</span><span className="pref-sub">Último backup: Hoje às 14:35</span></div></div><div className="pref-right"><button className="pref-btn-small">Fazer backup</button></div></div>
                      <div className="pref-list-item"><div className="pref-left"><div className="pref-icon-box" style={{background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4'}}>📥</div><div className="pref-text-box"><span className="pref-title">Exportar dados</span><span className="pref-sub">Baixe um relatório dos seus dados</span></div></div><div className="pref-right">›</div></div>
                    </div>
                  </div>

                  <div className="p-sub-panel">
                    <div className="p-sub-header"><h3>Atividade recente</h3><button className="p-link-green">Ver tudo</button></div>
                    <div className="activity-timeline">
                      <div className="activity-item">
                        <div className="activity-line"></div><div className="act-icon" style={{background: 'rgba(92, 214, 133, 0.15)', color: '#5cd685'}}>✓</div>
                        <div className="act-content"><div className="act-text"><span className="act-title">Compra "{purchases.length > 0 ? purchases[0].desc : 'Registrada'}"</span><span className="act-sub">Registrada com sucesso</span></div><span className="act-time">Hoje, 14:35</span></div>
                      </div>
                      <div className="activity-item">
                        <div className="activity-line"></div><div className="act-icon" style={{background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6'}}>💳</div>
                        <div className="act-content"><div className="act-text"><span className="act-title">Cartão atualizado</span><span className="act-sub">Limite alterado</span></div><span className="act-time">Ontem, 21:12</span></div>
                      </div>
                      <div className="activity-item">
                        <div className="activity-line"></div><div className="act-icon" style={{background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7'}}>📈</div>
                        <div className="act-content"><div className="act-text"><span className="act-title">Relatório gerado</span><span className="act-sub">Inteligência de categorias</span></div><span className="act-time">Ontem, 18:47</span></div>
                      </div>
                      <div className="activity-item">
                        <div className="activity-line"></div><div className="act-icon" style={{background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b'}}>🔔</div>
                        <div className="act-content"><div className="act-text"><span className="act-title">Lembrete de parcela</span><span className="act-sub">Para amanhã às 09:00</span></div><span className="act-time">Ontem, 09:15</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-footer-banner">
                  <div className="p-footer-content">
                    <div className="p-footer-icon">💎</div>
                    <div className="p-footer-text"><h3>Você está no controle!</h3><p>Continue organizando suas finanças e mantendo tudo em dia.</p></div>
                  </div>
                  <div className="p-footer-graphic">💸</div>
                </div>

              </div>
            </div>
          </>
        )}

        {/* ============ EDITAR PERFIL ============ */}
        {activeView === 'editar_perfil' && (
          <>
            <div className="edit-header-top">
              <div className="edit-header-left">
                <button className="btn-back" onClick={() => setActiveView('perfil')}>❮</button>
                <div className="edit-header-title">
                  <h1>Editar Perfil</h1>
                  <p>Atualize suas informações e preferências</p>
                </div>
              </div>
              <button className="btn-view-profile" onClick={() => setActiveView('perfil')}>👁️ Ver perfil</button>
            </div>

            <div className="edit-grid">
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div className="edit-panel">
                  <div className="edit-panel-title" style={{justifyContent: 'center', marginBottom: '10px'}}>Foto do perfil</div>
                  
                  <div className="photo-edit-area">
                    <div className="photo-circle-large">
                      AO
                      <div className="photo-edit-badge">✏️</div>
                    </div>
                    <span className="photo-hint">JPG, PNG ou GIF. Máx. 5MB</span>
                    <button className="btn-change-photo">↑ Alterar foto</button>
                  </div>

                  <div className="edit-tip-box" style={{marginTop: '10px'}}>
                    <div className="edit-tip-title">✨ Dica</div>
                    <div className="edit-tip-text">Uma foto ajuda a personalizar sua conta e torna tudo mais seu.</div>
                  </div>
                </div>

                <div className="edit-panel">
                  <div className="edit-panel-title" style={{color: 'var(--brand-green)'}}>🛡️ Segurança da conta</div>
                  <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '-15px', marginBottom: '10px'}}>Mantenha sua conta protegida</span>
                  
                  <div className="p-sec-link"><span>🔒 Alterar senha</span> <span>›</span></div>
                  <div className="p-sec-link"><span>💻 Sessões ativas</span> <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><span style={{background: 'rgba(128,128,128,0.1)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', color: 'var(--text-main)'}}>2</span> ›</span></div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                
                <div className="edit-panel">
                  <div className="edit-panel-title">👤 Informações pessoais</div>
                  
                  <div className="edit-form-grid">
                    <div className="edit-input-group">
                      <label>Nome completo</label>
                      <input type="text" className="edit-input" defaultValue="Angelo Oliveira" />
                    </div>
                    <div className="edit-input-group">
                      <label>Nome de exibição</label>
                      <div className="edit-input-wrapper">
                        <input type="text" className="edit-input has-icon-right" defaultValue="Angelo O." />
                        <span className="edit-input-icon-right" style={{color: 'var(--text-secondary)'}}>👤</span>
                      </div>
                    </div>
                    <div className="edit-input-group">
                      <label>E-mail</label>
                      <div className="edit-input-wrapper">
                        <input type="email" className="edit-input has-icon-right" defaultValue="angelo.o@email.com" />
                        <span className="edit-input-icon-right">✅</span>
                      </div>
                    </div>
                    <div className="edit-input-group">
                      <label>Data de nascimento</label>
                      <div className="edit-input-wrapper">
                        <input type="text" className="edit-input has-icon-right" defaultValue="15/08/1995" />
                        <span className="edit-input-icon-right" style={{color: 'var(--text-secondary)'}}>📅</span>
                      </div>
                    </div>
                    <div className="edit-input-group">
                      <label>Telefone (opcional)</label>
                      <div className="edit-input-wrapper">
                        <span className="edit-input-icon-left">📞</span>
                        <input type="text" className="edit-input has-icon-left" defaultValue="(11) 98765-4321" />
                      </div>
                    </div>
                    <div className="edit-input-group">
                      <label>Moeda padrão <span style={{fontSize: '0.7rem', color: '#6b7280', fontWeight: 'normal', marginLeft: '5px'}}>Usado para relatórios</span></label>
                      <div className="edit-input-wrapper">
                        <span className="edit-input-icon-left">💲</span>
                        <select className="edit-input has-icon-left" style={{appearance: 'none', cursor: 'pointer'}}>
                          <option value="BRL">Real (R$)</option>
                          <option value="USD">Dólar (US$)</option>
                          <option value="EUR">Euro (€)</option>
                        </select>
                        <span className="edit-input-icon-right" style={{color: 'var(--text-secondary)', pointerEvents: 'none'}}>⌄</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="edit-panel">
                  <div className="edit-panel-title">⚙️ Preferências da conta</div>
                  <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '-15px'}}>Personalize sua experiência no app</span>
                  
                  <div className="edit-preferences-grid">
                    <div className="pref-box">
                      <div className="pref-box-header"><span>🌙</span> Tema</div>
                      <div className="pref-select-wrapper">
                        {/* SELETOR DE TEMA REAL */}
                        <select className="pref-select" value={appTheme} onChange={(e) => setAppTheme(e.target.value)}>
                          <option value="Escuro">Escuro</option>
                          <option value="Claro">Claro</option>
                        </select>
                      </div>
                    </div>
                    <div className="pref-box">
                      <div className="pref-box-header"><span style={{color: 'var(--brand-green)'}}>🔔</span> Notificações</div>
                      <div className="pref-select-wrapper">
                        <select className="pref-select">
                          <option>Ativadas</option>
                          <option>Apenas alertas</option>
                          <option>Desativadas</option>
                        </select>
                      </div>
                    </div>
                    <div className="pref-box">
                      <div className="pref-box-header"><span style={{color: '#a855f7'}}>📅</span> Lembretes de parcelas</div>
                      <div className="pref-select-wrapper">
                        <select className="pref-select">
                          <option>Ativados</option>
                          <option>1 dia antes</option>
                          <option>Desativados</option>
                        </select>
                      </div>
                    </div>
                    <div className="pref-box">
                      <div className="pref-box-header"><span style={{color: '#5cd685'}}>✉️</span> Resumo por e-mail</div>
                      <div className="pref-select-wrapper">
                        <select className="pref-select">
                          <option>Semanalmente</option>
                          <option>Mensalmente</option>
                          <option>Nunca</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="edit-actions-bar">
                  <button className="btn-delete-account">🗑️ Excluir conta</button>
                  <div className="edit-actions-right">
                    <button className="btn-cancel" onClick={() => setActiveView('perfil')}>Cancelar</button>
                    <button className="btn-save" onClick={() => { showToast("Perfil atualizado com sucesso!"); setActiveView('perfil'); }}>✓ Salvar alterações</button>
                  </div>
                </div>

              </div>
            </div>
          </>
        )}
      </main>

      {/* MODAIS (Det. Cartão e Compras) */}
      {overlayCardDetails && (
        <div className="modal-overlay" onClick={() => setOverlayCardDetails(null)}>
          <div className="card-details-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setOverlayCardDetails(null)}>✕</button>
            <div className="card-details-header">
              <div className="card-details-visual" style={{ background: getCardVisuals(overlayCardDetails.name).bg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><div className="card-chip"></div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.2rem' }}>)))</div></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{renderFlagLogo(getCardVisuals(overlayCardDetails.name).flag)}</div>
              </div>
              <div className="card-details-stats">
                <div className="stat-block"><span className="value green">R$ {overlayStats.total.toFixed(2)}</span><span className="label">em parcelas</span></div>
                <div className="stat-block"><span className="value yellow">{overlayStats.pagas}/{overlayStats.totalCount}</span><span className="label">pagas</span></div>
                <div className="stat-block"><span style={{ fontSize: '1.8rem', fontWeight: '700' }}>{overlayStats.proximaData}</span><span className="label">próxima em</span></div>
              </div>
            </div>
            <div className="card-details-body">
              <table className="premium-table">
                <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Ação</th></tr></thead>
                <tbody>
                  {overlayInstallments.length === 0 ? ( <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Nenhuma parcela registrada.</td></tr> ) : (
                    overlayInstallments.map((item) => {
                      const isPaid = item.status === 'Pago';
                      return (
                        <tr key={item.id} style={{ opacity: isPaid ? 0.5 : 1 }}>
                          <td><strong>{item.desc}</strong><div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.installmentNumber}</div></td>
                          <td>{item.dueDate.split('-').reverse().join('/')}</td>
                          <td style={{ fontWeight: 600 }}>R$ {item.amount.toFixed(2)}</td>
                          <td><div className="badge-dot" style={{ backgroundColor: isPaid ? 'rgba(92, 214, 133, 0.15)' : 'rgba(234, 179, 8, 0.15)', color: isPaid ? '#5cd685' : '#facc15' }}>{item.status} <span className="dot" style={{ backgroundColor: isPaid ? '#5cd685' : '#facc15' }}></span></div></td>
                          <td><input type="checkbox" className="custom-checkbox" checked={isPaid} onChange={() => handleTogglePayment(item.id, item.status)} /></td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
              <div className="modal-input-group"><label>Categoria</label><div className="modal-tags">{['Eletrônicos', 'Casa', 'Assinaturas', 'Viagem', 'Educação', 'Outros'].map(cat => { const isSelected = purchaseCategory === cat; return ( <span key={cat} className="modal-tag" onClick={() => setPurchaseCategory(cat)} style={isSelected ? { backgroundColor: categoryColors[cat], color: '#000', fontWeight: 600 } : {}}>{cat}</span> )})}</div></div>
              <button type="submit" className="modal-btn-submit" style={{ backgroundColor: editingPurchaseId ? '#a855f7' : 'var(--brand-green)' }}>{editingPurchaseId ? 'Atualizar Faturas' : 'Criar Parcelas'}</button>
            </form>
          </div>
        </div>
      )}

      {toast.show && (<div className="toast-container"><div className={`toast toast-${toast.type}`}><span className="toast-icon">{toast.type === 'success' ? '✅' : '⚠️'}</span><span>{toast.msg}</span></div></div>)}
    </div>
  )
}

export default App