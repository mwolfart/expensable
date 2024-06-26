import type { SerializeFrom } from '@remix-run/server-runtime'
import type {
  ExpenseWithCategory,
  FetcherResponse,
  TransactionWithExpenses,
} from '~/utils/types'
import { useTranslation } from 'react-i18next'
import { formatCurrency, formatDate, truncStr } from '~/utils/helpers'
import { BsTrash } from 'react-icons/bs'
import { MdOutlineEdit } from 'react-icons/md'
import { useFetcher, useNavigate } from '@remix-run/react'
import { useContext, useEffect, useState } from 'react'
import { BeatLoader } from 'react-spinners'
import { TransactionItemExpense } from './transaction-item-expense'
import { ToastContext, ToastType } from '../../../providers/toast'
import { DialogContext } from '~/presentation/providers/dialog'
import { DeletionPrompt } from '../common/deletion-prompt'

type Props = {
  transaction: SerializeFrom<TransactionWithExpenses>
}

type ExpensesFetcher = FetcherResponse & {
  expenses: unknown
  total: number
}

export function TransactionItem({ transaction }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showToast } = useContext(ToastContext)
  const { openDialog, closeDialog } = useContext(DialogContext)

  const fetcher = useFetcher<FetcherResponse>()
  const expensesFetcher = useFetcher<ExpensesFetcher>()

  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([])
  const [expenseTotal, setExpenseTotal] = useState(0)

  useEffect(() => {
    if (fetcher.data?.method === 'delete' && fetcher.data.success) {
      showToast(ToastType.SUCCESS, t('transactions.deleted'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.data])

  useEffect(() => {
    if (expensesFetcher.data) {
      setExpenses(expensesFetcher.data.expenses as ExpenseWithCategory[])
      setExpenseTotal(expensesFetcher.data.total)
    }
  }, [expensesFetcher.data])

  useEffect(() => {
    const expensesToFetch = transaction.expenses
      .map(({ expenseId }) => expenseId)
      .join(',')
    if (expensesToFetch.length > 0) {
      expensesFetcher.load(`/expenses?ids=${expensesToFetch}&limit=5`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transaction.expenses])

  const onDelete = () => {
    fetcher.submit(
      { id: transaction.id },
      { method: 'delete', action: '/transactions' },
    )
    closeDialog()
  }

  const onDeletePrompt = () => {
    openDialog(<DeletionPrompt onConfirm={onDelete} onCancel={closeDialog} />)
  }

  const onEdit = () => {
    navigate(`/transaction/${transaction.id}`)
  }

  const date = formatDate(new Date(transaction.datetime))

  return (
    <div className="grid items-center gap-2 bg-foreground py-4 sm:grid-cols-2">
      <p className="text-md font-semibold hidden md:block">
        {transaction.location?.toString()}
      </p>
      <p className="text-md font-semibold block md:hidden">
        {truncStr(transaction.location, 10)}
      </p>
      <p className="sm:text-right">{date}</p>
      <div>
        <p>{formatCurrency(transaction.total)}</p>
      </div>
      <div className="my-2 flex flex-row flex-nowrap gap-2 sm:justify-end">
        {expensesFetcher.state === 'loading' ? (
          <BeatLoader color="grey" size={10} />
        ) : (
          <>
            <div className="hidden lg:flex flex-row flex-nowrap gap-2">
              {expenses.map(({ id, title, amount }) => (
                <TransactionItemExpense
                  key={id}
                  title={title}
                  amount={amount}
                />
              ))}
              {expenseTotal > 5 && (
                <div className="flex items-center gap-1">
                  <span>+</span>
                  <p>{t('common.n-more', { value: expenseTotal - 5 })}</p>
                </div>
              )}
            </div>
            <div className="flex items-center lg:hidden">
              <span>{t('common.n-items', { value: expenseTotal })}</span>
            </div>
          </>
        )}
      </div>
      <div className="flex justify-end gap-4 sm:col-span-2">
        <button
          className="btn-outline btn-primary min-h-8 btn hidden h-10 w-24 sm:block"
          onClick={onEdit}
        >
          {t('common.edit')}
        </button>
        <button
          className="btn-outline btn-primary min-h-8 btn hidden h-10 w-24 sm:block"
          onClick={onDeletePrompt}
        >
          {t('common.delete')}
        </button>
        <button
          className="btn-outline btn-primary min-h-8 btn block h-10 sm:hidden"
          aria-label={t('common.edit')}
          onClick={onEdit}
        >
          <MdOutlineEdit size={20} />
        </button>
        <button
          className="btn-outline btn-primary min-h-8 btn block h-10 sm:hidden"
          aria-label={t('common.delete')}
          onClick={onDeletePrompt}
        >
          <BsTrash size={20} />
        </button>
      </div>
    </div>
  )
}
