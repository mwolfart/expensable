import type {
  AddTransactionFormErrors,
  TransactionWithExpenses,
} from '~/utils/types'
import type {
  ActionArgs,
  LoaderArgs,
  TypedResponse,
} from '@remix-run/server-runtime'
import { useRevalidator, useSearchParams } from '@remix-run/react'
import { useContext, useState } from 'react'
import { typedjson, useTypedLoaderData } from 'remix-typedjson'
import { useTranslations } from 'use-intl'
import { NoData } from '~/components/no-data'
import { PaginationButtons } from '~/components/pagination-buttons'
import { Toast } from '~/components/toast'
import { TransactionList } from '~/components/transaction-list'
import { useFilter } from '~/hooks/use-filter'
import { usePagination } from '~/hooks/use-pagination'
import {
  countUserTransactions,
  countUserTransactionsByFilter,
  createTransaction,
  deleteTransaction,
  getUserTransactions,
  getUserTransactionsByFilter,
  updateTransaction,
} from '~/models/transaction.server'
import { DialogContext } from '~/providers/dialog'
import { getUserId } from '~/session.server'
import { areAllValuesEmpty, cxWithGrowFadeLg, parseExpenses } from '~/utils'
import { timeout } from '~/utils/timeout'
import { AiOutlinePlus } from 'react-icons/ai'
import { PaginationLimitSelect } from '~/components/pagination-limit-select'
import { FilterButton } from '~/components/filter-button'
import { MobileCancelDialog } from '~/components/mobile-cancel-dialog'
import { TransactionFilterComponent } from '~/components/transaction-filters'
import { ErrorCodes } from '~/utils/schemas'
import { UpsertTransactionDialog } from '~/components/transaction-upsert-dialog'

export async function loader({ request }: LoaderArgs) {
  const userId = await getUserId(request)
  if (userId) {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') as string)
    const offset = parseInt(url.searchParams.get('offset') as string)
    const filter = {
      startDate: url.searchParams.get('startDate'),
      endDate: url.searchParams.get('endDate'),
    }
    if (!areAllValuesEmpty(filter)) {
      const parsedFilter = {
        startDate: filter.startDate ? new Date(filter.startDate) : null,
        endDate: filter.endDate ? new Date(filter.endDate) : null,
      }
      const count = await countUserTransactionsByFilter(userId, parsedFilter)
      const data = await getUserTransactionsByFilter(
        userId,
        parsedFilter,
        offset,
        limit,
      )
      if (data) {
        return typedjson({ transactions: data, total: count })
      }
    } else {
      const count = await countUserTransactions(userId)
      const data = await getUserTransactions(userId, offset, limit)
      if (data) {
        return typedjson({ transactions: data, total: count })
      }
    }
  }
  return typedjson({ transactions: [], total: 0 })
}

export async function action({ request }: ActionArgs): Promise<
  TypedResponse<{
    errors?: AddTransactionFormErrors
    success?: boolean
    method?: string
  }>
> {
  const { method } = request
  const res = { method }
  if (method === 'PUT') {
    const formData = await request.formData()
    const id = formData.get('id')
    const title = formData.get('title')
    const date = formData.get('date')
    const expensesJson = formData.get('expenses')

    if (typeof title !== 'string' || !title.length) {
      return typedjson(
        { errors: { title: ErrorCodes.TITLE_REQUIRED }, ...res },
        { status: 400 },
      )
    }

    if (typeof date !== 'string' || isNaN(Date.parse(date))) {
      return typedjson(
        { errors: { date: ErrorCodes.BAD_DATE_FORMAT }, ...res },
        { status: 400 },
      )
    }

    const expenses =
      typeof expensesJson === 'string' && parseExpenses(expensesJson)
    if (!expenses) {
      return typedjson(
        { errors: { expenses: ErrorCodes.BAD_FORMAT }, ...res },
        { status: 400 },
      )
    }

    try {
      const userId = await getUserId(request)
      if (!userId) {
        return typedjson({ success: false, ...res }, { status: 403 })
      }

      const transaction = {
        datetime: new Date(Date.parse(date)),
        location: title,
        userId,
      }

      if (typeof id === 'string' && id !== '') {
        await updateTransaction({ id, ...transaction }, expenses)
      } else {
        await createTransaction(transaction, expenses)
      }
    } catch (e) {
      return typedjson({ success: false, ...res }, { status: 500 })
    }
    return typedjson({ success: true, ...res }, { status: 200 })
  }
  if (method === 'DELETE') {
    const formData = await request.formData()
    const id = formData.get('id')
    if (typeof id !== 'string' || id === '') {
      return typedjson(
        { errors: { categories: ErrorCodes.INVALID_ID }, ...res },
        { status: 400 },
      )
    }

    try {
      await deleteTransaction(id)
    } catch (e) {
      return typedjson({ success: false, ...res }, { status: 500 })
    }
    return typedjson({ success: true, ...res }, { status: 200 })
  }
  return typedjson({ success: false, ...res }, { status: 405 })
}

export default function Transactions() {
  const { transactions, total } = useTypedLoaderData<typeof loader>()
  const t = useTranslations()
  const revalidator = useRevalidator()

  const [params] = useSearchParams()
  const [startDate, endDate] = [params.get('startDate'), params.get('endDate')]
  const appliedFilters = {
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
  }

  const { openDialog } = useContext(DialogContext)
  const [showFilters, setShowFilters] = useState(false)
  const [showUpsertToast, setShowUpsertToast] = useState(false)
  const [showDeletedToast, setShowDeletedToast] = useState(false)
  const [upsertText, setUpsertText] = useState('')

  const pagination = usePagination({ url: '/transactions', total })
  const filter = useFilter({ url: '/transactions' })

  const onTransactionUpserted = async (updated?: boolean) => {
    setUpsertText(updated ? t('transactions.saved') : t('transactions.created'))
    revalidator.revalidate()
    setShowUpsertToast(true)
    await timeout(3000)
    setShowUpsertToast(false)
  }

  const onAddTransaction = () => {
    openDialog(
      <UpsertTransactionDialog onUpserted={onTransactionUpserted} />,
      true,
    )
  }

  const onTransactionDeleted = async () => {
    setShowDeletedToast(true)
    await timeout(3000)
    setShowDeletedToast(false)
  }

  const onEditExpense = (transaction: TransactionWithExpenses) => {
    openDialog(
      <UpsertTransactionDialog
        onUpserted={() => onTransactionUpserted(true)}
        initialData={transaction}
      />,
      true,
    )
  }

  const FiltersBlock = (
    <TransactionFilterComponent
      onApplyFilters={filter.onApplyFilters}
      onClearFilters={filter.onClearFilters}
      initialFilters={appliedFilters}
    />
  )

  return (
    <div className="m-8 mt-0 md:mt-4">
      {showUpsertToast && (
        <Toast message={upsertText} severity="alert-success" />
      )}
      {showDeletedToast && (
        <Toast message={t('transactions.deleted')} severity="alert-info" />
      )}
      {showFilters && (
        <MobileCancelDialog
          content={FiltersBlock}
          onClose={() => setShowFilters(false)}
        />
      )}
      <div className="mb-8 flex items-end justify-between">
        <div className="flex items-end gap-4">
          <FilterButton
            onClick={() => setShowFilters(!showFilters)}
            isFilterApplied={filter.isFilterApplied}
          />
          <PaginationLimitSelect onChangeLimit={pagination.onChangeLimit} />
        </div>
        <button className="btn-primary btn" onClick={onAddTransaction}>
          <div className="hidden sm:block">{t('transactions.add')}</div>
          <AiOutlinePlus className="block text-white sm:hidden" size={24} />
        </button>
      </div>
      <div className={cxWithGrowFadeLg('hidden md:block', showFilters)}>
        {FiltersBlock}
      </div>
      {!transactions.length && (
        <NoData>
          <p>{t('transactions.try-adding')}</p>
        </NoData>
      )}
      {!!transactions.length && (
        <>
          <TransactionList
            transactions={transactions}
            renderDeleteToast={onTransactionDeleted}
            renderEditDialog={onEditExpense}
          />
          <PaginationButtons total={total} {...pagination} />
        </>
      )}
    </div>
  )
}