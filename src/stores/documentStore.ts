import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Template, Workspace } from '@/types'

interface DocumentState {
  workspace: Workspace
  setTemplate: (template: Template | null) => void
  setSectionContent: (sectionId: string, content: string) => void
  updateLastModified: () => void
  resetWorkspace: () => void
  clearTemplate: () => void
}

const defaultWorkspace: Workspace = {
  template: null,
  chatHistory: [],
  sectionContents: {},
  lastModified: new Date().toISOString(),
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set) => ({
      workspace: defaultWorkspace,

      setTemplate: (template) =>
        set((state) => ({
          workspace: {
            ...state.workspace,
            template,
            lastModified: new Date().toISOString(),
          },
        })),

      setSectionContent: (sectionId, content) =>
        set((state) => ({
          workspace: {
            ...state.workspace,
            sectionContents: {
              ...state.workspace.sectionContents,
              [sectionId]: content,
            },
            lastModified: new Date().toISOString(),
          },
        })),

      updateLastModified: () =>
        set((state) => ({
          workspace: {
            ...state.workspace,
            lastModified: new Date().toISOString(),
          },
        })),

      resetWorkspace: () => set({ workspace: defaultWorkspace }),

      clearTemplate: () =>
        set((state) => ({
          workspace: {
            ...state.workspace,
            template: null,
            lastModified: new Date().toISOString(),
          },
        })),
    }),
    {
      name: 'gameworder:workspace',
      partialize: (state) => ({ workspace: state.workspace }),
    }
  )
)
