/**
 * Company-wise DSA questions: Easy (4), Medium (4), Hard (2) per company.
 * Sourced from commonly asked / most reported interview questions for each company.
 */

export type DSAQuestionSet = {
  easy: string[];
  medium: string[];
  hard: string[];
};

/** Generic set: 4 easy, 4 medium, 2 hard — used when no company-specific list exists */
export const GENERIC_DSA_QUESTIONS: DSAQuestionSet = {
  easy: [
    "Two Sum / Pair with given sum",
    "Reverse a linked list",
    "Valid Parentheses",
    "Merge two sorted arrays",
  ],
  medium: [
    "Longest Substring Without Repeating Characters",
    "Binary Tree Level Order Traversal",
    "Maximum subarray sum (Kadane's algorithm)",
    "Detect cycle in linked list",
  ],
  hard: [
    "Merge K Sorted Lists",
    "LRU Cache implementation",
  ],
};

/** Company-specific DSA questions (Easy 4, Medium 4, Hard 2) — most asked / frequently reported */
export const COMPANY_DSA_QUESTIONS: Record<string, DSAQuestionSet> = {
  google: {
    easy: [
      "Two Sum",
      "Roman to Integer",
      "Valid Parentheses",
      "Merge Two Sorted Lists",
    ],
    medium: [
      "Add Two Numbers (linked list)",
      "Longest Substring Without Repeating Characters",
      "3Sum Closest",
      "Peak Element / Find peak in array",
    ],
    hard: [
      "Merge K Sorted Lists",
      "Serialize and Deserialize Binary Tree",
    ],
  },
  amazon: {
    easy: [
      "Two Sum",
      "Valid Parentheses",
      "Merge Two Sorted Lists",
      "Contains Duplicate",
    ],
    medium: [
      "Number of Islands",
      "Group Anagrams",
      "Top K Frequent Elements",
      "Trapping Rain Water",
    ],
    hard: [
      "LRU Cache",
      "Merge K Sorted Lists",
    ],
  },
  microsoft: {
    easy: [
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge Two Sorted Lists",
      "Remove duplicates from sorted array",
    ],
    medium: [
      "Add Two Numbers (linked lists)",
      "Search in Rotated Sorted Array",
      "Lowest Common Ancestor of a Binary Tree",
      "Clone linked list with next and random pointer",
    ],
    hard: [
      "Serialize and Deserialize Binary Tree",
      "Median of Two Sorted Arrays",
    ],
  },
  meta: {
    easy: [
      "Valid Parentheses",
      "Merge Sorted Array",
      "Valid Palindrome",
      "Two Sum",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary Tree Level Order Traversal",
      "Kth Largest Element in an Array",
      "Minimum Remove to Make Valid Parentheses",
    ],
    hard: [
      "Merge K Sorted Lists",
      "Binary Tree Vertical Order Traversal",
    ],
  },
  apple: {
    easy: [
      "Two Sum",
      "Reverse linked list",
      "Valid Parentheses",
      "Merge Two Sorted Lists",
    ],
    medium: [
      "LRU Cache",
      "Longest Palindromic Substring",
      "Binary Tree Level Order Traversal",
      "3Sum",
    ],
    hard: [
      "Merge K Sorted Lists",
      "Serialize and Deserialize Binary Tree",
    ],
  },
  adobe: {
    easy: [
      "Two Sum",
      "Reverse linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Search in Rotated Sorted Array",
      "Binary Tree Level Order Traversal",
      "Product of Array Except Self",
    ],
    hard: [
      "LRU Cache",
      "Merge K Sorted Lists",
    ],
  },
  oracle: {
    easy: [
      "Two Sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Detect cycle in linked list",
      "Binary Tree Level Order Traversal",
      "Find peak element",
    ],
    hard: [
      "LRU Cache",
      "Merge K Sorted Lists",
    ],
  },
  "goldman-sachs": {
    easy: [
      "Two Sum",
      "Valid Parentheses",
      "Reverse linked list",
      "Merge two sorted arrays",
    ],
    medium: [
      "Trapping Rain Water",
      "Longest Increasing Subsequence",
      "Number of Islands",
      "Course Schedule",
    ],
    hard: [
      "Merge K Sorted Lists",
      "Word Search II (Trie + DFS)",
    ],
  },
  jpmorgan: {
    easy: [
      "Two Sum",
      "Valid Parentheses",
      "Reverse linked list",
      "Merge two sorted arrays",
    ],
    medium: [
      "Best Time to Buy and Sell Stock",
      "Longest Substring Without Repeating Characters",
      "Binary Tree Level Order Traversal",
      "Group Anagrams",
    ],
    hard: [
      "Merge K Sorted Lists",
      "LRU Cache",
    ],
  },
  flipkart: {
    easy: [
      "Two Sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Search in Rotated Sorted Array",
      "Merge K Sorted Lists",
      "LRU Cache",
      "Topological Sort",
    ],
    hard: [
      "Serialize and Deserialize Binary Tree",
      "The Celebrity Problem",
    ],
  },
  walmart: {
    easy: [
      "Two Sum",
      "Valid Parentheses",
      "Reverse linked list",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Number of Islands",
      "Binary Tree Level Order Traversal",
      "Group Anagrams",
    ],
    hard: [
      "LRU Cache",
      "Merge K Sorted Lists",
    ],
  },
  uber: {
    easy: [
      "Two Sum",
      "Valid Parentheses",
      "Reverse linked list",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Number of Islands",
      "Binary Tree Level Order Traversal",
      "Course Schedule",
    ],
    hard: [
      "Merge K Sorted Lists",
      "Serialize and Deserialize Binary Tree",
    ],
  },
  netflix: {
    easy: [
      "Two Sum",
      "Valid Parentheses",
      "Reverse linked list",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "LRU Cache",
      "Binary Tree Level Order Traversal",
      "Group Anagrams",
    ],
    hard: [
      "Merge K Sorted Lists",
      "Serialize and Deserialize Binary Tree",
    ],
  },
  paypal: {
    easy: [
      "Two Sum",
      "Valid Parentheses",
      "Reverse linked list",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary Tree Level Order Traversal",
      "Product of Array Except Self",
      "Group Anagrams",
    ],
    hard: [
      "LRU Cache",
      "Merge K Sorted Lists",
    ],
  },
  salesforce: {
    easy: [
      "Two Sum",
      "Valid Parentheses",
      "Reverse linked list",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary Tree Level Order Traversal",
      "Number of Islands",
      "Top K Frequent Elements",
    ],
    hard: [
      "Merge K Sorted Lists",
      "LRU Cache",
    ],
  },
  atlassian: {
    easy: [
      "Two Sum",
      "Valid Parentheses",
      "Reverse linked list",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary Tree Level Order Traversal",
      "Design Min Stack",
      "Group Anagrams",
    ],
    hard: [
      "Merge K Sorted Lists",
      "LRU Cache",
    ],
  },
  intel: {
    easy: [
      "Two Sum",
      "Reverse linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary Tree Level Order Traversal",
      "Detect cycle in linked list",
      "Find peak element",
    ],
    hard: [
      "Merge K Sorted Lists",
      "Serialize and Deserialize Binary Tree",
    ],
  },
  nvidia: {
    easy: [
      "Two Sum",
      "Valid Parentheses",
      "Reverse linked list",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary Tree Level Order Traversal",
      "LRU Cache",
      "Number of Islands",
    ],
    hard: [
      "Merge K Sorted Lists",
      "Serialize and Deserialize Binary Tree",
    ],
  },
  vmware: {
    easy: [
      "Two Sum",
      "Valid Parentheses",
      "Reverse linked list",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary Tree Level Order Traversal",
      "Detect cycle in linked list",
      "Top K Frequent Elements",
    ],
    hard: [
      "Merge K Sorted Lists",
      "LRU Cache",
    ],
  },
  cisco: {
    easy: [
      "Two Sum",
      "Reverse linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary Tree Level Order Traversal",
      "Detect cycle in linked list",
      "Search in Rotated Sorted Array",
    ],
    hard: [
      "Merge K Sorted Lists",
      "LRU Cache",
    ],
  },
  ibm: {
    easy: [
      "Two Sum",
      "Valid Parentheses",
      "Reverse linked list",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary Tree Level Order Traversal",
      "Detect cycle in linked list",
      "Group Anagrams",
    ],
    hard: [
      "Merge K Sorted Lists",
      "LRU Cache",
    ],
  },
  infosys: {
    easy: [
      "Two Sum / Pair with given sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "Kadane's algorithm (max subarray sum)",
    ],
    hard: [
      "LRU Cache",
      "Merge K Sorted Lists",
    ],
  },
  tcs: {
    easy: [
      "Two Sum / Pair with given sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "Find peak element",
    ],
    hard: [
      "LRU Cache",
      "Merge K Sorted Lists",
    ],
  },
  accenture: {
    easy: [
      "Two Sum / Pair with given sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "Kadane's algorithm (max subarray sum)",
    ],
    hard: [
      "LRU Cache",
      "Merge K Sorted Lists",
    ],
  },
  capgemini: {
    easy: [
      "Two Sum / Pair with given sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "Kadane's algorithm (max subarray sum)",
    ],
    hard: [
      "LRU Cache",
      "Merge K Sorted Lists",
    ],
  },
  cognizant: {
    easy: [
      "Two Sum / Pair with given sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "Kadane's algorithm (max subarray sum)",
    ],
    hard: [
      "LRU Cache",
      "Merge K Sorted Lists",
    ],
  },
  "hcl-technologies": {
    easy: [
      "Two Sum / Pair with given sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "Kadane's algorithm (max subarray sum)",
    ],
    hard: [
      "LRU Cache",
      "Merge K Sorted Lists",
    ],
  },
  "tech-mahindra": {
    easy: [
      "Two Sum / Pair with given sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "Kadane's algorithm (max subarray sum)",
    ],
    hard: [
      "LRU Cache",
      "Merge K Sorted Lists",
    ],
  },
  persistent: {
    easy: [
      "Two Sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "LRU Cache",
    ],
    hard: [
      "Merge K Sorted Lists",
      "Serialize and Deserialize Binary Tree",
    ],
  },
  epam: {
    easy: [
      "Two Sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "Number of Islands",
    ],
    hard: [
      "Merge K Sorted Lists",
      "LRU Cache",
    ],
  },
  globallogic: {
    easy: [
      "Two Sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "Group Anagrams",
    ],
    hard: [
      "Merge K Sorted Lists",
      "LRU Cache",
    ],
  },
  amadeus: {
    easy: [
      "Two Sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "LRU Cache",
    ],
    hard: [
      "Merge K Sorted Lists",
      "Serialize and Deserialize Binary Tree",
    ],
  },
  juspay: {
    easy: [
      "Two Sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "LRU Cache",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
    ],
    hard: [
      "Merge K Sorted Lists",
      "Serialize and Deserialize Binary Tree",
    ],
  },
  accolite: {
    easy: [
      "Two Sum / Pair with given sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "Kadane's algorithm (max subarray sum)",
    ],
    hard: [
      "LRU Cache",
      "Merge K Sorted Lists",
    ],
  },
  "publicis-sapient": {
    easy: [
      "Two Sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "Number of Islands",
    ],
    hard: [
      "Merge K Sorted Lists",
      "LRU Cache",
    ],
  },
  lti: {
    easy: [
      "Two Sum / Pair with given sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "Kadane's algorithm (max subarray sum)",
    ],
    hard: [
      "LRU Cache",
      "Merge K Sorted Lists",
    ],
  },
  "dxc-technology": {
    easy: [
      "Two Sum / Pair with given sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "Kadane's algorithm (max subarray sum)",
    ],
    hard: [
      "LRU Cache",
      "Merge K Sorted Lists",
    ],
  },
  hexaware: {
    easy: [
      "Two Sum / Pair with given sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "Kadane's algorithm (max subarray sum)",
    ],
    hard: [
      "LRU Cache",
      "Merge K Sorted Lists",
    ],
  },
  "tata-elxsi": {
    easy: [
      "Two Sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "LRU Cache",
    ],
    hard: [
      "Merge K Sorted Lists",
      "Serialize and Deserialize Binary Tree",
    ],
  },
  cybage: {
    easy: [
      "Two Sum / Pair with given sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Detect cycle in linked list",
      "Kadane's algorithm (max subarray sum)",
    ],
    hard: [
      "LRU Cache",
      "Merge K Sorted Lists",
    ],
  },
  "zs-associates": {
    easy: [
      "Two Sum",
      "Reverse a linked list",
      "Valid Parentheses",
      "Merge two sorted arrays",
    ],
    medium: [
      "Longest Substring Without Repeating Characters",
      "Binary tree level order traversal",
      "Group Anagrams",
      "Top K Frequent Elements",
    ],
    hard: [
      "Merge K Sorted Lists",
      "LRU Cache",
    ],
  },
};

/** Returns DSA question set for a company; falls back to generic if not defined */
export function getCompanyDsaQuestions(companyId: string | undefined): DSAQuestionSet {
  if (!companyId) return GENERIC_DSA_QUESTIONS;
  return COMPANY_DSA_QUESTIONS[companyId] ?? GENERIC_DSA_QUESTIONS;
}
