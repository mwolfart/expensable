import type { TransactionExpenseInput, TransactionFilters } from '~/utils/types'
import type { Expense, Transaction } from '@prisma/client'
import { prisma } from '~/db.server'
import { DEFAULT_DATA_LIMIT } from '~/utils'

export const getUserTransactions = (
  id: string,
  offset?: number,
  limit?: number,
) =>
  prisma.transaction.findMany({
    include: {
      expenses: true,
    },
    where: {
      userId: id,
    },
    skip: offset || 0,
    take: limit || DEFAULT_DATA_LIMIT,
    orderBy: {
      datetime: 'asc',
    },
  })

// TODO: Prisma does not currently support counting along with fetching. Change this in the future to use only one query
export const countUserTransactions = (id: string) =>
  prisma.transaction.count({
    where: {
      userId: id,
    },
  })

const getWhereClauseFromFilter = (
  userId: string,
  { startDate, endDate }: TransactionFilters,
) => {
  const datetime = {
    ...(startDate && { lte: startDate }),
    ...(endDate && { gte: endDate }),
  }

  const where = {
    userId,
    ...((startDate || endDate) && { datetime }),
  }
  return where
}

export const getUserTransactionsByFilter = (
  userId: string,
  filters: TransactionFilters,
  offset?: number,
  limit?: number,
) => {
  const where = getWhereClauseFromFilter(userId, filters)
  return prisma.transaction.findMany({
    where,
    include: {
      expenses: true,
    },
    skip: offset || 0,
    take: limit || DEFAULT_DATA_LIMIT,
    orderBy: {
      datetime: 'asc',
    },
  })
}

// TODO: Prisma does not currently support counting along with fetching. Change this in the future to use only one query
export const countUserTransactionsByFilter = (
  userId: string,
  filters: TransactionFilters,
) => {
  const where = getWhereClauseFromFilter(userId, filters)
  return prisma.transaction.count({
    where,
    orderBy: {
      datetime: 'asc',
    },
  })
}

export const createTransaction = async (
  transaction: Pick<Transaction, 'location' | 'datetime' | 'userId'>,
  expenses: TransactionExpenseInput[],
) => {
  let total = 0
  const expensesPromise = expenses.map(async ({ categoryId, ...expense }) => {
    total += expense.amount
    const exp = await prisma.expense.create({
      data: {
        datetime: transaction.datetime,
        userId: transaction.userId,
        ...expense,
      },
    })
    await prisma.categoriesOnExpense.create({
      data: {
        expenseId: exp.id,
        categoryId,
      },
    })
    return exp
  })
  const expensesRes = await Promise.all(expensesPromise)
  const transactionRes = await prisma.transaction.create({
    data: { ...transaction, total },
  })
  const expInTransactionPromise = expensesRes.map(({ id: expenseId }) =>
    prisma.expensesInTransaction.create({
      data: {
        expenseId,
        transactionId: transactionRes.id,
      },
    }),
  )
  await Promise.all(expInTransactionPromise)
  return transactionRes
}

const removeExpensesFromTransaction = async (transactionId: string) => {
  const expenses = await prisma.expensesInTransaction.findMany({
    where: {
      transactionId,
    },
  })
  const promises = expenses.map(({ id }) =>
    prisma.expense.delete({ where: { id } }),
  )
  await Promise.all(promises)
}

const createTransactionExpense = async (
  transactionId: string,
  expense: Omit<Expense, 'id'>,
  categoryId: string,
) => {
  const { id } = await prisma.expense.create({ data: expense })
  const categoryPromise = prisma.categoriesOnExpense.create({
    data: {
      expenseId: id,
      categoryId,
    },
  })
  const transactionPromise = prisma.expensesInTransaction.create({
    data: {
      expenseId: id,
      transactionId,
    },
  })
  await categoryPromise
  await transactionPromise
}

export const updateTransaction = async (
  transaction: Omit<Transaction, 'total'>,
  expenses: TransactionExpenseInput[],
) => {
  // TODO if user does not change anything in expenses, don't remove/update them
  // TODO change only expenses & category that are modified (low priority)
  await removeExpensesFromTransaction(transaction.id)
  const creationPromises = expenses.map(({ categoryId, ...expense }) =>
    createTransactionExpense(
      transaction.id,
      {
        datetime: transaction.datetime,
        userId: transaction.userId,
        ...expense,
      },
      categoryId,
    ),
  )
  await Promise.all(creationPromises)
  return prisma.transaction.update({
    where: {
      id: transaction.id,
    },
    data: transaction,
  })
}

export const deleteTransaction = async (transactionId: string) => {
  await removeExpensesFromTransaction(transactionId)
  await prisma.transaction.delete({
    where: {
      id: transactionId,
    },
  })
}