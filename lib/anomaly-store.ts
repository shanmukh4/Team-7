/**
 * Anomaly Store - Persistent anomaly state management
 * Uses localStorage to survive page refreshes
 * All anomaly operations go through this store
 */

export interface StoredAnomaly {
  id: string
  desk_id: string
  title: string
  reportedPnL: number
  expectedPnL: number
  variance: number
  rootCause?: string
}

const STORAGE_KEY = 'gs_anomalies'
const RESOLVED_KEY = 'gs_resolved_anomalies'
const INITIAL_ANOMALIES_KEY = 'gs_initial_anomalies_seeded'

// Initial 9 anomalies for seeding
const INITIAL_ANOMALIES: StoredAnomaly[] = [
  {
    id: '1',
    desk_id: 'EQUITY_DERIV',
    title: 'Equity Derivatives Variance',
    reportedPnL: 15.2,
    expectedPnL: 12.8,
    variance: 2.4,
    rootCause: 'Pricing model mismatch on delta hedges'
  },
  {
    id: '2',
    desk_id: 'FX_TRADING',
    title: 'FX Trading Desk Discrepancy',
    reportedPnL: 8.7,
    expectedPnL: 9.1,
    variance: -0.4,
    rootCause: 'Unbooked swap revaluation'
  },
  {
    id: '3',
    desk_id: 'FIXED_INCOME',
    title: 'Fixed Income Spread Error',
    reportedPnL: 12.9,
    expectedPnL: 10.4,
    variance: 2.5,
    rootCause: 'Incorrect spread curve interpolation'
  },
  {
    id: '4',
    desk_id: 'CDS_TRADING',
    title: 'Credit Default Swap Drift',
    reportedPnL: 7.3,
    expectedPnL: 4.9,
    variance: 2.4,
    rootCause: 'Counterparty markup not applied consistently'
  },
  {
    id: '5',
    desk_id: 'COMMODITIES',
    title: 'Commodity Futures Reconciliation',
    reportedPnL: 5.8,
    expectedPnL: 3.6,
    variance: 2.2,
    rootCause: 'Expired contract volumes still included'
  },
  {
    id: '6',
    desk_id: 'IRS_TRADING',
    title: 'Interest Rate Swap Mismatch',
    reportedPnL: 11.1,
    expectedPnL: 9.7,
    variance: 1.4,
    rootCause: 'Overnight rate feed lag in valuation engine'
  },
  {
    id: '7',
    desk_id: 'EMFX_TRADING',
    title: 'Emerging Markets FX Glitch',
    reportedPnL: 9.4,
    expectedPnL: 7.2,
    variance: 2.2,
    rootCause: 'Stale liquidity provider quotes'
  },
  {
    id: '8',
    desk_id: 'STRUCTURED_PRODUCTS',
    title: 'Structured Product Mispricing',
    reportedPnL: 18.2,
    expectedPnL: 15.5,
    variance: 2.7,
    rootCause: 'Volatility surface not properly updated'
  },
  {
    id: '9',
    desk_id: 'OPTIONS_TRADING',
    title: 'Options Greeks Calculation Error',
    reportedPnL: 16.8,
    expectedPnL: 13.3,
    variance: 3.5,
    rootCause: 'Vega sensitivity not recalibrated'
  }
]

/**
 * AnomalyStore - Client-side persistent anomaly management
 * All state persists in localStorage to survive page refreshes
 */
export class AnomalyStore {
  /**
   * Initialize store - seed with initial anomalies on first load
   */
  static init(): void {
    if (typeof window === 'undefined') return

    // Check if we've already seeded
    const seeded = localStorage.getItem(INITIAL_ANOMALIES_KEY)
    if (!seeded) {
      // First time - save initial anomalies and mark as seeded
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ANOMALIES))
      localStorage.setItem(INITIAL_ANOMALIES_KEY, 'true')
      localStorage.setItem(RESOLVED_KEY, JSON.stringify([]))
    }
  }

  /**
   * Get all unresolved anomalies
   */
  static getActiveAnomalies(): StoredAnomaly[] {
    if (typeof window === 'undefined') return INITIAL_ANOMALIES

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const resolvedStr = localStorage.getItem(RESOLVED_KEY)
      const resolved = resolvedStr ? JSON.parse(resolvedStr) : []

      if (!stored) {
        // Fallback if storage is empty
        return INITIAL_ANOMALIES
      }

      const all: StoredAnomaly[] = JSON.parse(stored)
      // Filter out resolved anomalies by desk_id
      return all.filter(a => !resolved.includes(a.desk_id))
    } catch (error) {
      console.error('[ANOMALY_STORE] Error getting active anomalies:', error)
      return INITIAL_ANOMALIES
    }
  }

  /**
   * Get all anomalies including resolved ones
   */
  static getAllAnomalies(): StoredAnomaly[] {
    if (typeof window === 'undefined') return INITIAL_ANOMALIES

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : INITIAL_ANOMALIES
    } catch (error) {
      console.error('[ANOMALY_STORE] Error getting all anomalies:', error)
      return INITIAL_ANOMALIES
    }
  }

  /**
   * Get resolved anomaly desk IDs
   */
  static getResolvedIds(): string[] {
    if (typeof window === 'undefined') return []

    try {
      const resolvedStr = localStorage.getItem(RESOLVED_KEY)
      return resolvedStr ? JSON.parse(resolvedStr) : []
    } catch (error) {
      console.error('[ANOMALY_STORE] Error getting resolved IDs:', error)
      return []
    }
  }

  /**
   * Mark anomaly as resolved
   */
  static markResolved(deskId: string): void {
    if (typeof window === 'undefined') return

    try {
      const resolved = this.getResolvedIds()
      if (!resolved.includes(deskId)) {
        resolved.push(deskId)
        localStorage.setItem(RESOLVED_KEY, JSON.stringify(resolved))
      }
    } catch (error) {
      console.error('[ANOMALY_STORE] Error marking resolved:', error)
    }
  }

  /**
   * Get active anomaly count
   */
  static getActiveCount(): number {
    return this.getActiveAnomalies().length
  }

  /**
   * Get total resolved count
   */
  static getResolvedCount(): number {
    return this.getResolvedIds().length
  }

  /**
   * Reset all anomalies to initial state (for demo/testing)
   */
  static reset(): void {
    if (typeof window === 'undefined') return

    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ANOMALIES))
    localStorage.setItem(RESOLVED_KEY, JSON.stringify([]))
  }

  /**
   * Clear all storage
   */
  static clear(): void {
    if (typeof window === 'undefined') return

    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(RESOLVED_KEY)
    localStorage.removeItem(INITIAL_ANOMALIES_KEY)
  }
}
