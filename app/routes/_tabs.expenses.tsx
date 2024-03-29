import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  TypedResponse,
} from '@remix-run/server-runtime'
import type { AddExpenseFormErrors } from '~/utils/types'
import { json } from '@remix-run/server-runtime'
import { useTranslation } from 'react-i18next'
import { AiOutlinePlus } from 'react-icons/ai'
import {
  countUserExpenses,
  countUserExpensesByFilter,
  countUserExpensesByIds,
  createExpense,
  deleteExpense,
  getUserExpenses,
  getUserExpensesByFilter,
  getUserExpensesByIds,
  updateExpense,
} from '~/infra/models/expenses.server'
import { getLoggedUserId } from '~/infra/session.server'
import { NoData } from '~/presentation/components/layout/no-data'
import { ExpenseList } from '~/presentation/components/feature/expense/expense-list'
import { useContext, useState } from 'react'
import { DialogContext } from '~/presentation/providers/dialog'
import { UpsertExpenseDialog } from '~/presentation/components/feature/expense/expense-upsert-dialog'
import { ErrorCodes } from '~/utils/enum'
import {
  areAllValuesEmpty,
  cxWithGrowFadeLg,
  parseCategoryInput,
  validateServerSchema,
} from '~/utils/helpers'
import {
  useLoaderData,
  useRevalidator,
  useSearchParams,
} from '@remix-run/react'
import { ExpenseFilterComponent } from '~/presentation/components/feature/expense/expense-filters'
import { usePagination } from '~/presentation/hooks/use-pagination'
import { useFilter } from '~/presentation/hooks/use-filter'
import { PaginationButtons } from '~/presentation/components/ui/pagination-buttons'
import { MobileCancelDialog } from '~/presentation/components/layout/mobile-cancel-dialog'
import { PaginationLimitSelect } from '~/presentation/components/ui/pagination-limit-select'
import { FilterButton } from '~/presentation/components/ui/filter-button'
import { DataListContainer } from '~/presentation/components/layout/data-list-container'
import { handleError } from '~/entry.server'
import { expenseSchema } from '~/utils/schemas/server'

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getLoggedUserId(request)
  if (userId) {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') as string)
    const offset = parseInt(url.searchParams.get('offset') as string)
    const ids = url.searchParams.get('ids')?.split(',')

    if (ids) {
      const count = await countUserExpensesByIds(userId, ids)
      const data = await getUserExpensesByIds(userId, ids, 0, limit)
      return json({ expenses: data, total: count })
    }

    const filter = {
      title: url.searchParams.get('title'),
      startDate: url.searchParams.get('startDate'),
      endDate: url.searchParams.get('endDate'),
      categoriesIds: url.searchParams.get('categories'),
    }

    if (!areAllValuesEmpty(filter)) {
      const parsedFilter = {
        title: filter.title,
        startDate: filter.startDate ? new Date(filter.startDate) : null,
        endDate: filter.endDate ? new Date(filter.endDate) : null,
        categoriesIds: filter.categoriesIds?.split(','),
      }
      const count = await countUserExpensesByFilter(userId, parsedFilter)
      const data = await getUserExpensesByFilter(
        userId,
        parsedFilter,
        offset,
        limit,
      )
      if (data) {
        return json({ expenses: data, total: count })
      }
    } else {
      const count = await countUserExpenses(userId)
      const data = await getUserExpenses(userId, offset, limit)
      if (data) {
        return json({ expenses: data, total: count })
      }
    }
  }
  return json({ expenses: [], total: 0 })
}

export async function action({ request }: ActionFunctionArgs): Promise<
  TypedResponse<{
    errors?: AddExpenseFormErrors
    success?: boolean
    method?: string
  }>
> {
  const { method } = request
  const res = { method }
  if (method === 'PUT') {
    const formData = await request.formData()
    const dataObj = Object.fromEntries(formData.entries())
    const validationErrors = validateServerSchema(expenseSchema, dataObj)
    if (validationErrors !== null) {
      return json({ ...validationErrors, ...res }, { status: 400 })
    }

    const id = formData.get('id')
    const title = formData.get('title') as string
    const amount = formData.get('amount') as string
    const unit = formData.get('unit') as string
    const date = formData.get('date') as string
    const installments = formData.get('installments') as string
    const categories = formData.get('categories') as string

    let parsedCategories
    if (typeof categories === 'string') {
      try {
        parsedCategories = parseCategoryInput(categories)
      } catch (_) {
        return json(
          { errors: { categories: ErrorCodes.BAD_CATEGORY_DATA }, ...res },
          { status: 400 },
        )
      }
    }

    try {
      const userId = await getLoggedUserId(request)
      if (!userId) {
        return json({ success: false, ...res }, { status: 403 })
      }

      if (typeof id === 'string' && id !== '') {
        await updateExpense(
          {
            id,
            title,
            amount: parseFloat(amount.replace(/[^0-9.]/g, '')),
            unit: unit ? parseFloat(unit.replace(/[^0-9.]/g, '')) : null,
            datetime: new Date(Date.parse(date)),
            installments: parseInt(installments),
            userId,
          },
          parsedCategories,
        )
      } else {
        await createExpense(
          {
            title,
            amount: parseFloat(amount.replace(/[^0-9.]/g, '')),
            unit: unit ? parseFloat(unit.replace(/[^0-9.]/g, '')) : null,
            datetime: new Date(Date.parse(date)),
            installments: parseInt(installments),
            userId,
          },
          parsedCategories,
        )
      }
    } catch (e) {
      handleError(e)
      return json({ success: false, ...res }, { status: 500 })
    }
    return json({ success: true, ...res }, { status: 200 })
  }
  if (method === 'DELETE') {
    const formData = await request.formData()
    const id = formData.get('id')
    if (typeof id !== 'string' || id === '') {
      return json(
        { errors: { categories: ErrorCodes.INVALID_ID }, ...res },
        { status: 400 },
      )
    }

    try {
      await deleteExpense(id)
    } catch (e) {
      handleError(e)
      return json({ success: false, ...res }, { status: 500 })
    }
    return json({ success: true, ...res }, { status: 200 })
  }
  return json({ success: false, ...res }, { status: 405 })
}

export default function Expenses() {
  const { expenses, total } = useLoaderData<typeof loader>()
  const { t } = useTranslation()
  const revalidator = useRevalidator()

  const [params] = useSearchParams()
  const [startDate, endDate] = [params.get('startDate'), params.get('endDate')]
  const appliedFilters = {
    title: params.get('title'),
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    categoriesIds: params.get('categoriesIds')?.split(','),
  }

  const { openDialog } = useContext(DialogContext)
  const [showFilters, setShowFilters] = useState(false)

  const pagination = usePagination({ url: '/expenses', total })
  const filter = useFilter({ url: '/expenses' })

  const onAddExpense = () => {
    openDialog(
      <UpsertExpenseDialog onUpserted={() => revalidator.revalidate()} />,
    )
  }

  const FiltersBlock = (
    <ExpenseFilterComponent
      onApplyFilters={filter.onApplyFilters}
      onClearFilters={filter.onClearFilters}
      initialFilters={appliedFilters}
    />
  )

  return (
    <DataListContainer>
      {showFilters && (
        <MobileCancelDialog
          content={FiltersBlock}
          onClose={() => setShowFilters(false)}
        />
      )}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:gap-0 sm:items-end">
        <div className="flex items-end gap-4">
          <FilterButton
            onClick={() => setShowFilters(!showFilters)}
            isFilterApplied={filter.isFilterApplied}
          />
          <PaginationLimitSelect onChangeLimit={pagination.onChangeLimit} />
        </div>
        <button className="btn-primary btn" onClick={onAddExpense}>
          <AiOutlinePlus className="block text-white sm:hidden" size={24} />
          {t('expenses.add')}
        </button>
      </div>
      <div className={cxWithGrowFadeLg('hidden md:block', showFilters)}>
        {FiltersBlock}
      </div>
      {!expenses.length && (
        <NoData>
          <p>{t('expenses.try-adding')}</p>
        </NoData>
      )}
      {!!expenses.length && (
        <>
          <ExpenseList expenses={expenses} />
          <PaginationButtons total={total} {...pagination} />
        </>
      )}
    </DataListContainer>
  )
}
