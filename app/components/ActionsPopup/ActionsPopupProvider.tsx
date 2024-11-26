import { createContext, useContext, useState } from 'react'
import { Action } from './types'
import ActionsPopup from './ActionsPopup'

export type ActionsPopupContextState = {
  actions: Action[]
  showActions: (actions: Action[]) => void
}

const initialState: ActionsPopupContextState = {
  actions: [],
  showActions: null,
}

const ActionsPopupContext =
  createContext<ActionsPopupContextState>(initialState)

export const ActionsPopupProvider = ({ children }) => {
  const [actions, setActionsState] = useState<Action[]>([])
  const [showPopup, setShowPopup] = useState<Boolean>(false)

  const showActions = (actions: Action[]) => {
    setActionsState(actions)
    setShowPopup(!showPopup)
  }

  return (
    <ActionsPopupContext.Provider
      value={{
        actions,
        showActions,
      }}
    >
      {children}
      {showPopup && <ActionsPopup setShow={setShowPopup} actions={actions} />}
    </ActionsPopupContext.Provider>
  )
}

export const useActionsPopupContext = () => useContext(ActionsPopupContext)
