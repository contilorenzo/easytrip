import { createContext, useContext, useState } from 'react'
import { ActionsMenuConfig } from './types'
import ActionsPopup from './ActionsPopup'

export type ActionsPopupContextState = {
  actionsMenuConfig: ActionsMenuConfig
  showActionsMenu: (actionsMenuConfig: ActionsMenuConfig) => void
}

const emptyMenuConfig = {
  actions: [],
}

const initialState: ActionsPopupContextState = {
  actionsMenuConfig: emptyMenuConfig,
  showActionsMenu: null,
}

const ActionsPopupContext =
  createContext<ActionsPopupContextState>(initialState)

export const ActionsPopupProvider = ({ children }) => {
  const [actionsMenuConfig, setActionsMenuConfigState] =
    useState<ActionsMenuConfig>(emptyMenuConfig)
  const [showPopup, setShowPopup] = useState<Boolean>(false)

  const showActionsMenu = (config: ActionsMenuConfig) => {
    setActionsMenuConfigState(config)
    setShowPopup(!showPopup)
  }

  const closePopup = () => {
    setActionsMenuConfigState(emptyMenuConfig)
    setShowPopup(false)
  }

  return (
    <ActionsPopupContext.Provider
      value={{
        actionsMenuConfig,
        showActionsMenu,
      }}
    >
      {children}
      {showPopup && (
        <ActionsPopup
          closePopup={closePopup}
          actionsMenuConfig={actionsMenuConfig}
        />
      )}
    </ActionsPopupContext.Provider>
  )
}

export const useActionsPopupContext = () => useContext(ActionsPopupContext)
