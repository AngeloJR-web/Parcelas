import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getCards: () => ipcRenderer.invoke('get-cards'),
  addCard: (card) => ipcRenderer.invoke('add-card', card),
  updateCard: (card) => ipcRenderer.invoke('update-card', card),
  deleteCard: (id) => ipcRenderer.invoke('delete-card', id), 
  
  addPurchase: (purchase) => ipcRenderer.invoke('add-purchase', purchase),
  updatePurchase: (purchase) => ipcRenderer.invoke('update-purchase', purchase),
  getPurchases: () => ipcRenderer.invoke('get-purchases'),
  getInstallments: () => ipcRenderer.invoke('get-installments'),
  deletePurchase: (id) => ipcRenderer.invoke('delete-purchase', id),
  
  updateInstallmentStatus: (id, status) => ipcRenderer.invoke('update-installment-status', id, status)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}