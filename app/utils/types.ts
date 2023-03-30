import type {
  CategoriesOnExpense,
  Expense,
  ExpensesInTransaction,
  Transaction,
} from '@prisma/client'

export type ExpenseWithCategory = Expense & {
  categories: CategoriesOnExpense[]
}

export type TransactionWithExpenses = Transaction & {
  expenses: ExpensesInTransaction[]
}

export type CategoryInputArray = Array<{ id: string; text: string }>

export type TransactionExpenseInput = Pick<
  Expense,
  'title' | 'unit' | 'amount' | 'installments'
> & {
  categoryId: string
}

export type AddExpenseFormErrors = {
  name?: string
  amount?: string
  unit?: string
  date?: string
  categories?: string
  installments?: string
  message?: string
}

export type ExpenseFilters = {
  title?: string | null
  startDate?: Date | null
  endDate?: Date | null
  categoriesIds?: string[] | null
}

export type AddTransactionFormErrors = {
  title?: string
  date?: string
  expenses?: string
}

export type TransactionFilters = {
  startDate?: Date | null
  endDate?: Date | null
}
