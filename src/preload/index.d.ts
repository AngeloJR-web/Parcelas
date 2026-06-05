import { ElectronAPI } from '@electron-toolkit/preload'

export interface Card {
  id?: number;
  name: string;
  closingDate: number;
  dueDate: number;
  limitTotal: number;
}

export interface Purchase {
  id?: number;
  cardId: number;
  description: string;
  totalAmount: number;
  installmentsCount: number;
  purchaseDate: string;
  category: string;
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getCards: () => Promise<Card[]>
      addCard: (card: Card) => Promise<{ success: boolean; id?: number; error?: string }>
      updateCard: (card: Card) => Promise<{ success: boolean; error?: string }>
      deleteCard: (id: number) => Promise<{ success: boolean; error?: string }>
      
      addPurchase: (purchase: Purchase) => Promise<{ success: boolean; error?: string }>
      updatePurchase: (purchase: Purchase) => Promise<{ success: boolean; error?: string }>
      getPurchases: () => Promise<any[]>
      getInstallments: () => Promise<any[]>
      deletePurchase: (id: number) => Promise<{ success: boolean; error?: string }>
      
      updateInstallmentStatus: (id: number, status: string) => Promise<{ success: boolean; error?: string }>
    }
  }
}