/**
 * SQL practice questions with schema and sample data.
 * Used by SqlPracticePage; run via sql.js in the browser.
 */

export type SqlQuestion = {
  title: string;
  problem: string;
  schemaAndSeed: string;
  hint?: string;
};

const SQL_QUESTIONS: SqlQuestion[] = [
  {
    title: "Second Highest Salary",
    problem: `Given an Employee table with id and salary, write a query to get the second highest salary. If there is no second highest salary, return null.

Example: For ids 1,2,3 with salaries 100, 200, 200 the second highest is 100 (or 200 if you consider distinct salaries—clarify with interviewer).`,
    schemaAndSeed: `CREATE TABLE Employee (id INTEGER PRIMARY KEY, salary INTEGER);
INSERT INTO Employee VALUES (1, 100);
INSERT INTO Employee VALUES (2, 200);
INSERT INTO Employee VALUES (3, 200);
INSERT INTO Employee VALUES (4, 300);`,
    hint: "Use ORDER BY salary DESC LIMIT 1 OFFSET 1, or subquery with MAX(salary) < (SELECT MAX(salary)...).",
  },
  {
    title: "Nth Highest Salary",
    problem: `Write a query to get the Nth highest salary (e.g. 2nd). Handle duplicates: often "Nth highest" means distinct salaries, so 100, 200, 200 → 2nd highest is 100.`,
    schemaAndSeed: `CREATE TABLE Employee (id INTEGER PRIMARY KEY, salary INTEGER);
INSERT INTO Employee VALUES (1, 100);
INSERT INTO Employee VALUES (2, 200);
INSERT INTO Employee VALUES (3, 200);
INSERT INTO Employee VALUES (4, 300);`,
    hint: "DISTINCT salary, ORDER BY salary DESC, LIMIT 1 OFFSET (N-1).",
  },
  {
    title: "Duplicate Emails",
    problem: `Given a Person table with id and email, find all duplicate emails. Return the duplicate email values.`,
    schemaAndSeed: `CREATE TABLE Person (id INTEGER PRIMARY KEY, email TEXT);
INSERT INTO Person VALUES (1, 'a@b.com');
INSERT INTO Person VALUES (2, 'c@d.com');
INSERT INTO Person VALUES (3, 'a@b.com');`,
    hint: "GROUP BY email HAVING COUNT(*) > 1.",
  },
  {
    title: "Employees Earning More Than Their Manager",
    problem: `Given Employee with id, name, salary, managerId, find employees who earn more than their manager. Return employee name.`,
    schemaAndSeed: `CREATE TABLE Employee (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER, managerId INTEGER);
INSERT INTO Employee VALUES (1, 'Joe', 70000, 3);
INSERT INTO Employee VALUES (2, 'Henry', 80000, 4);
INSERT INTO Employee VALUES (3, 'Sam', 60000, NULL);
INSERT INTO Employee VALUES (4, 'Max', 90000, NULL);`,
    hint: "Self join: FROM Employee e JOIN Employee m ON e.managerId = m.id WHERE e.salary > m.salary.",
  },
  {
    title: "Department-Wise Max Salary",
    problem: `Given Employee (id, name, salary, departmentId) and Department (id, name), find the max salary in each department. Return department name and max salary.`,
    schemaAndSeed: `CREATE TABLE Department (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE Employee (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER, departmentId INTEGER);
INSERT INTO Department VALUES (1, 'IT');
INSERT INTO Department VALUES (2, 'Sales');
INSERT INTO Employee VALUES (1, 'Joe', 70000, 1);
INSERT INTO Employee VALUES (2, 'Jim', 90000, 1);
INSERT INTO Employee VALUES (3, 'Henry', 80000, 2);
INSERT INTO Employee VALUES (4, 'Sam', 60000, 2);`,
    hint: "JOIN Employee with Department, GROUP BY departmentId (or department name), MAX(salary).",
  },
  {
    title: "Rank / Dense_Rank (Window Functions)",
    problem: `Given a Scores table (id, score), rank the scores. Same score should get the same rank, and the next rank should be consecutive (dense_rank style). Return score and its rank (dense_rank).`,
    schemaAndSeed: `CREATE TABLE Scores (id INTEGER PRIMARY KEY, score REAL);
INSERT INTO Scores VALUES (1, 3.50);
INSERT INTO Scores VALUES (2, 3.65);
INSERT INTO Scores VALUES (3, 4.00);
INSERT INTO Scores VALUES (4, 3.85);
INSERT INTO Scores VALUES (5, 4.00);
INSERT INTO Scores VALUES (6, 3.65);`,
    hint: "SQLite: use a subquery to count how many distinct scores are >= current score (dense rank). Or in DBs that support: DENSE_RANK() OVER (ORDER BY score DESC).",
  },
  {
    title: "Customers Who Never Order",
    problem: `Given Customers (id, name) and Orders (id, customerId), find names of customers who never placed an order.`,
    schemaAndSeed: `CREATE TABLE Customers (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE Orders (id INTEGER PRIMARY KEY, customerId INTEGER);
INSERT INTO Customers VALUES (1, 'Joe');
INSERT INTO Customers VALUES (2, 'Henry');
INSERT INTO Customers VALUES (3, 'Sam');
INSERT INTO Customers VALUES (4, 'Max');
INSERT INTO Orders VALUES (1, 3);
INSERT INTO Orders VALUES (2, 1);`,
    hint: "LEFT JOIN Orders and keep WHERE order id IS NULL, or use NOT IN (SELECT customerId FROM Orders).",
  },
  {
    title: "Combine Two Tables (Person Address)",
    problem: `Given Person (personId, lastName, firstName) and Address (addressId, personId, city, state), return each person's first name, last name, city, and state. Include people with no address (city/state as null).`,
    schemaAndSeed: `CREATE TABLE Person (personId INTEGER PRIMARY KEY, lastName TEXT, firstName TEXT);
CREATE TABLE Address (addressId INTEGER PRIMARY KEY, personId INTEGER, city TEXT, state TEXT);
INSERT INTO Person VALUES (1, 'Wang', 'Allen');
INSERT INTO Person VALUES (2, 'Alice', 'Bob');
INSERT INTO Address VALUES (1, 2, 'New York City', 'New York');`,
    hint: "LEFT JOIN Person with Address ON Person.personId = Address.personId.",
  },
  {
    title: "Rising Temperature (Self Join on Dates)",
    problem: `Given Weather (id, recordDate, temperature), find all dates where the temperature was higher than the previous day's temperature. Return the id of such dates. (Assume recordDate is the day; "previous" = exactly one day before.)`,
    schemaAndSeed: `CREATE TABLE Weather (id INTEGER PRIMARY KEY, recordDate TEXT, temperature INTEGER);
INSERT INTO Weather VALUES (1, '2015-01-01', 10);
INSERT INTO Weather VALUES (2, '2015-01-02', 25);
INSERT INTO Weather VALUES (3, '2015-01-03', 20);
INSERT INTO Weather VALUES (4, '2015-01-04', 30);`,
    hint: "Self join: today's recordDate = yesterday's recordDate + 1 day. SQLite: use date(today.recordDate) = date(yesterday.recordDate, '+1 day').",
  },
  {
    title: "Big Countries",
    problem: `World table: name, continent, area, population, gdp. A country is big if area >= 3e6 OR population >= 25e6. Return name, population, area for all big countries.`,
    schemaAndSeed: `CREATE TABLE World (name TEXT PRIMARY KEY, continent TEXT, area INTEGER, population INTEGER, gdp INTEGER);
INSERT INTO World VALUES ('Afghanistan', 'Asia', 652230, 25500100, 20343000);
INSERT INTO World VALUES ('Albania', 'Europe', 28748, 2831741, 12960000);
INSERT INTO World VALUES ('Algeria', 'Africa', 2381741, 37100000, 188681000);
INSERT INTO World VALUES ('Andorra', 'Europe', 468, 78115, 3712000);
INSERT INTO World VALUES ('Angola', 'Africa', 1246700, 20609294, 100990000);`,
    hint: "SELECT name, population, area FROM World WHERE area >= 3000000 OR population >= 25000000.",
  },
];

export function getSqlQuestion(index: number): SqlQuestion | null {
  const i = Math.max(0, Math.min(index, SQL_QUESTIONS.length - 1));
  return SQL_QUESTIONS[i] ?? null;
}

export function getSqlQuestionsList(): string[] {
  return SQL_QUESTIONS.map((q) => q.title);
}

export const sqlQuestionsCount = SQL_QUESTIONS.length;
