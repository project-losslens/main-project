import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/authContext'
import {
  clearCloudPersonalData,
  configureCloudPersonalData,
} from '../lib/personalData'
import {
  configureCloudBetStorage,
} from '../lib/betDatabase'

type Props = {
  children: ReactNode
}

type LoadState =
  | { status: 'loading'; ownerId: string }
  | { status: 'ready'; ownerId: string }
  | { status: 'error'; ownerId: string; message: string }

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Your account data could not be loaded.'
}

function CloudDataProvider({ children }: Props) {
  const { session } = useAuth()
  const ownerId = session?.user.id ?? ''
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<LoadState>({
    status: 'loading',
    ownerId,
  })

  useEffect(() => {
    if (!ownerId) {
      return
    }

    let active = true
    clearCloudPersonalData()
    configureCloudBetStorage(null)

    async function loadData() {
      try {
        const cloudData = await import('../lib/cloudData')
        const [currentUserId, setupStatus, personalData] = await Promise.all([
          cloudData.getCloudUserId(),
          cloudData.getDataSetupStatus(),
          cloudData.loadCloudPersonalData(),
        ])
        if (!setupStatus.ready) {
          throw new Error(
            'Active cloud-storage consent and completed data setup are required before private records can be opened.',
          )
        }
        await cloudData.loadCloudBets()
        if (currentUserId !== ownerId) {
          throw new Error('Your account changed while data was loading. Retry.')
        }
        if (!active) {
          return
        }

        const persistForOwner = async (data: typeof personalData) => {
          if ((await cloudData.getCloudUserId()) !== ownerId) {
            throw new Error('Your account changed before data could be saved.')
          }
          await cloudData.saveCloudPersonalData(data)
        }

        configureCloudPersonalData(personalData, persistForOwner)
        configureCloudBetStorage({
          load: async () => {
            if ((await cloudData.getCloudUserId()) !== ownerId) {
              throw new Error('Your account changed before records could be loaded.')
            }
            return cloudData.loadCloudBets()
          },
          save: async (record) => {
            if ((await cloudData.getCloudUserId()) !== ownerId) {
              throw new Error('Your account changed before the record could be saved.')
            }
            await cloudData.saveCloudBet(record)
          },
          delete: async (id) => {
            if ((await cloudData.getCloudUserId()) !== ownerId) {
              throw new Error('Your account changed before the record could be deleted.')
            }
            await cloudData.deleteCloudBet(id)
          },
        })
        setState({ status: 'ready', ownerId })
      } catch (error) {
        if (active) {
          setState({ status: 'error', ownerId, message: getErrorMessage(error) })
        }
      }
    }

    void loadData()
    return () => {
      active = false
      clearCloudPersonalData()
      configureCloudBetStorage(null)
    }
  }, [attempt, ownerId])

  if (state.ownerId !== ownerId || state.status === 'loading') {
    return (
      <div aria-live="polite" className="route-loading" role="status">
        Loading your account data…
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <section aria-labelledby="cloud-data-error-title" className="route-page">
        <h1 id="cloud-data-error-title">Account data is unavailable</h1>
        <p role="alert">{state.message}</p>
        <p>
          Your data has not been replaced. Check your connection and account
          setup, then retry. Get Support remains available without account data.
        </p>
        <button
          onClick={() => {
            setState({ status: 'loading', ownerId })
            setAttempt((value) => value + 1)
          }}
          type="button"
        >
          Retry loading data
        </button>
      </section>
    )
  }

  return children
}

export default CloudDataProvider
