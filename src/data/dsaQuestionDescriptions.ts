/**
 * Static problem descriptions (Problem, Constraints, Examples, Approach) for DSA questions.
 * Key = exact or normalized question text. No AI — content shows as-is when page opens.
 */

export type QuestionDescription = {
  problem: string;
  constraints: string;
  examples: string;
  approach: string;
};

/** Normalize for lookup: lowercase, collapse spaces, remove extra punctuation */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*[\/\-]\s*/g, " ")
    .trim();
}

const DESCRIPTIONS: Record<string, QuestionDescription> = {
  "two sum": {
    problem:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution.",
    constraints:
      "• 2 ≤ nums.length ≤ 10^4\n• -10^9 ≤ nums[i] ≤ 10^9\n• -10^9 ≤ target ≤ 10^9\n• Only one valid answer exists.",
    examples:
      "Example 1:\nInput: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1]\nExplanation: nums[0] + nums[1] = 2 + 7 = 9\n\nExample 2:\nInput: nums = [3, 2, 4], target = 6\nOutput: [1, 2]",
    approach:
      "• Use a hash map: for each element, check if (target - element) is already seen.\n• If yes, return [seen index, current index].\n• Else store current element and its index in the map.\n• One pass, O(n) time, O(n) space.",
  },
  "two sum / pair with given sum": {
    problem:
      "Given an array of integers and a target sum, find two numbers in the array that add up to the target. Return their indices (1-based or 0-based as per problem).",
    constraints:
      "• 2 ≤ n ≤ 10^4\n• -10^9 ≤ array[i] ≤ 10^9\n• Exactly one valid pair exists.",
    examples:
      "Example 1:\nInput: arr = [2, 7, 11, 15], target = 9\nOutput: [0, 1]\nExplanation: 2 + 7 = 9\n\nExample 2:\nInput: arr = [3, 2, 4], target = 6\nOutput: [1, 2]",
    approach:
      "• Hash map: for each value, check if (target - value) exists in map.\n• Store value → index. One pass O(n).",
  },
  "valid parentheses": {
    problem:
      "Given a string s containing only '(', ')', '{', '}', '[' and ']', determine if the input string is valid. Valid means: open brackets are closed by the same type and in the correct order.",
    constraints:
      "• 1 ≤ s.length ≤ 10^4\n• s consists of only '()[]{}'.",
    examples:
      "Example 1:\nInput: s = \"()\"\nOutput: true\n\nExample 2:\nInput: s = \"()[]{}\"\nOutput: true\n\nExample 3:\nInput: s = \"(]\"\nOutput: false",
    approach:
      "• Use a stack. For each char: if opening, push; if closing, pop and check it matches.\n• At end stack must be empty. O(n) time and space.",
  },
  "reverse a linked list": {
    problem:
      "Given the head of a singly linked list, reverse the list and return the new head.",
    constraints:
      "• 0 ≤ number of nodes ≤ 5000\n• -5000 ≤ Node.val ≤ 5000",
    examples:
      "Example 1:\nInput: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]\n\nExample 2:\nInput: head = [1,2]\nOutput: [2,1]",
    approach:
      "• Iterative: use three pointers (prev, curr, next). For each node, set curr.next = prev, then move all three.\n• Return prev as new head. O(n) time, O(1) space.",
  },
  "merge two sorted arrays": {
    problem:
      "Given two sorted integer arrays (or lists), merge them into one sorted array. You may assume the first array has enough space to hold both (for in-place variants).",
    constraints:
      "• 0 ≤ m, n ≤ 200\n• 1 ≤ m + n ≤ 200\n• -10^6 ≤ nums1[i], nums2[j] ≤ 10^6",
    examples:
      "Example 1:\nInput: nums1 = [1,2,3], m = 3, nums2 = [2,5,6], n = 3\nOutput: [1,2,2,3,5,6]\n\nExample 2:\nInput: nums1 = [1], m = 1, nums2 = [], n = 0\nOutput: [1]",
    approach:
      "• Two pointers from the end of both arrays (if in-place) or from start with extra array.\n• Compare and place larger (or smaller) in result. O(m + n) time.",
  },
  "merge two sorted lists": {
    problem:
      "Given the heads of two sorted linked lists, merge them into one sorted linked list. Return the head of the merged list.",
    constraints:
      "• 0 ≤ number of nodes in both lists ≤ 50\n• -100 ≤ Node.val ≤ 100",
    examples:
      "Example 1:\nInput: list1 = [1,2,4], list2 = [1,3,4]\nOutput: [1,1,2,3,4,4]\n\nExample 2:\nInput: list1 = [], list2 = []\nOutput: []",
    approach:
      "• Dummy head + two pointers. Compare node values, link smaller to result, move pointer.\n• O(m + n) time, O(1) space (excluding recursion stack).",
  },
  "longest substring without repeating characters": {
    problem:
      "Given a string s, find the length of the longest substring without repeating characters.",
    constraints:
      "• 0 ≤ s.length ≤ 5×10^4\n• s consists of English letters, digits, symbols.",
    examples:
      "Example 1:\nInput: s = \"abcabcbb\"\nOutput: 3\nExplanation: \"abc\" has length 3\n\nExample 2:\nInput: s = \"bbbbb\"\nOutput: 1\n\nExample 3:\nInput: s = \"pwwkew\"\nOutput: 3\nExplanation: \"wke\"",
    approach:
      "• Sliding window + hash set (or map of char → index). Expand right; if duplicate, shrink left until no duplicate.\n• Track max length. O(n) time.",
  },
  "binary tree level order traversal": {
    problem:
      "Given the root of a binary tree, return the level-order traversal of its nodes' values (i.e., from left to right, level by level).",
    constraints:
      "• 0 ≤ number of nodes ≤ 2000\n• -1000 ≤ Node.val ≤ 1000",
    examples:
      "Example 1:\nInput: root = [3,9,20,null,null,15,7]\nOutput: [[3],[9,20],[15,7]]\n\nExample 2:\nInput: root = [1]\nOutput: [[1]]",
    approach:
      "• BFS with a queue. Process level by level: record size of queue, pop that many nodes, add their values to current level list, push non-null children. O(n) time.",
  },
  "maximum subarray sum (kadane's algorithm)": {
    problem:
      "Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.",
    constraints:
      "• 1 ≤ nums.length ≤ 10^5\n• -10^4 ≤ nums[i] ≤ 10^4",
    examples:
      "Example 1:\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: [4,-1,2,1] has sum 6\n\nExample 2:\nInput: nums = [1]\nOutput: 1",
    approach:
      "• Kadane: keep current_sum and max_sum. For each element, current_sum = max(element, current_sum + element); max_sum = max(max_sum, current_sum). O(n) time, O(1) space.",
  },
  "detect cycle in linked list": {
    problem:
      "Given the head of a linked list, determine if the list has a cycle. A cycle exists if some node's next pointer points to an earlier node.",
    constraints:
      "• 0 ≤ number of nodes ≤ 10^4\n• -10^5 ≤ Node.val ≤ 10^5",
    examples:
      "Example 1:\nInput: head = [3,2,0,-4], pos = 1 (cycle from tail to index 1)\nOutput: true\n\nExample 2:\nInput: head = [1,2], pos = 0\nOutput: true",
    approach:
      "• Floyd’s cycle detection: slow and fast pointers. If they meet, there is a cycle. O(n) time, O(1) space.",
  },
  "merge k sorted lists": {
    problem:
      "Given an array of k linked lists, each sorted in ascending order, merge all into one sorted linked list.",
    constraints:
      "• k == lists.length\n• 0 ≤ k ≤ 10^4\n• 0 ≤ lists[i].length ≤ 500\n• -10^4 ≤ lists[i][j] ≤ 10^4",
    examples:
      "Example 1:\nInput: lists = [[1,4,5],[1,3,4],[2,6]]\nOutput: [1,1,2,3,4,4,5,6]\n\nExample 2:\nInput: lists = []\nOutput: []",
    approach:
      "• Min-heap (priority queue): push head of each list; pop min, add to result, push its next. O(N log k) where N = total nodes.\n• Or divide and conquer merge (merge pairs repeatedly). O(N log k).",
  },
  "lru cache": {
    problem:
      "Design a data structure that follows the Least Recently Used (LRU) cache eviction policy. Implement get(key) and put(key, value). get returns the value or -1; put inserts or updates. When capacity is exceeded, evict the least recently used item.",
    constraints:
      "• 1 ≤ capacity ≤ 3000\n• 0 ≤ key ≤ 10^4\n• 0 ≤ value ≤ 10^5\n• At most 2×10^5 calls to get and put.",
    examples:
      "Input: [\"LRUCache\",\"put\",\"put\",\"get\",\"put\",\"get\",\"put\",\"get\",\"get\",\"get\"]\n[[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]\nOutput: [null,null,null,1,null,-1,null,-1,3,4]",
    approach:
      "• Hash map (key → node) + doubly linked list (order by recent use). get: move node to front; put: add/update and move to front, evict from tail if over capacity. O(1) get and put.",
  },
  "lru cache implementation": {
    problem:
      "Implement an LRU (Least Recently Used) cache with get and put. When the cache is full, remove the least recently used item before inserting a new one.",
    constraints:
      "• 1 ≤ capacity ≤ 3000\n• 0 ≤ key ≤ 10^4\n• 0 ≤ value ≤ 10^5",
    examples:
      "LRUCache(2); put(1,1); put(2,2); get(1) → 1; put(3,3); get(2) → -1 (evicted); put(4,4); get(1) → -1; get(3) → 3; get(4) → 4.",
    approach:
      "• Map + doubly linked list for O(1) get/put. On get: move node to head. On put: update or insert at head; if over capacity, remove tail.",
  },
  "add two numbers (linked list)": {
    problem:
      "Given two non-empty linked lists representing two non-negative integers (digits in reverse order), add the two numbers and return the sum as a linked list in reverse order.",
    constraints:
      "• 1 ≤ number of nodes ≤ 100\n• 0 ≤ Node.val ≤ 9\n• No leading zeros.",
    examples:
      "Example 1:\nInput: l1 = [2,4,3], l2 = [5,6,4]\nOutput: [7,0,8]\nExplanation: 342 + 465 = 807\n\nExample 2:\nInput: l1 = [0], l2 = [0]\nOutput: [0]",
    approach:
      "• Simulate addition: traverse both lists, add digits + carry, create new node with (sum % 10), carry = sum / 10. O(max(m,n)) time.",
  },
  "number of islands": {
    problem:
      "Given a 2D grid of '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and formed by connecting adjacent lands horizontally or vertically.",
    constraints:
      "• m, n ≥ 1\n• grid[i][j] is '1' or '0'.",
    examples:
      "Example 1:\nInput: grid = [[\"1\",\"1\",\"1\"],[\"0\",\"1\",\"0\"],[\"1\",\"1\",\"1\"]]\nOutput: 1\n\nExample 2:\nInput: grid = [[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"1\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"1\",\"1\"]]\nOutput: 3",
    approach:
      "• DFS or BFS from each unvisited '1'. Mark visited (e.g. flip to '0'). Count number of DFS/BFS starts. O(m×n) time.",
  },
  "group anagrams": {
    problem:
      "Given an array of strings, group the anagrams together. An anagram is a word formed by rearranging the letters of another (e.g. \"eat\" and \"tea\").",
    constraints:
      "• 1 ≤ strs.length ≤ 10^4\n• 0 ≤ strs[i].length ≤ 100\n• strs[i] consists of lowercase English letters.",
    examples:
      "Example 1:\nInput: strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]\nOutput: [[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]\n\nExample 2:\nInput: strs = [\"\"]\nOutput: [[\"\"]]",
    approach:
      "• Use sorted string (or character count) as key in a hash map. Group strings by key. O(n × k log k) with sort; O(n × k) with count array.",
  },
  "trapping rain water": {
    problem:
      "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water can be trapped after raining.",
    constraints:
      "• n == height.length\n• 1 ≤ n ≤ 2×10^4\n• 0 ≤ height[i] ≤ 10^5",
    examples:
      "Example 1:\nInput: height = [0,1,0,2,1,0,1,3,2,1,2,1]\nOutput: 6\n\nExample 2:\nInput: height = [4,2,0,3,2,5]\nOutput: 9",
    approach:
      "• Two pointers: left and right. Track left_max and right_max. Water at current position = min(left_max, right_max) - height. O(n) time, O(1) space.",
  },
  "top k frequent elements": {
    problem:
      "Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.",
    constraints:
      "• 1 ≤ nums.length ≤ 10^5\n• -10^4 ≤ nums[i] ≤ 10^4\n• 1 ≤ k ≤ number of unique elements",
    examples:
      "Example 1:\nInput: nums = [1,1,1,2,2,3], k = 2\nOutput: [1,2]\n\nExample 2:\nInput: nums = [1], k = 1\nOutput: [1]",
    approach:
      "• Count frequencies (hash map). Then bucket sort by frequency (array of lists) or use min-heap of size k. O(n) bucket; O(n log k) heap.",
  },
  "search in rotated sorted array": {
    problem:
      "Given a sorted array that is rotated at an unknown pivot, and a target value, return the index of target in the array, or -1 if not present.",
    constraints:
      "• 1 ≤ nums.length ≤ 5000\n• -10^4 ≤ nums[i], target ≤ 10^4\n• All values in nums are unique.",
    examples:
      "Example 1:\nInput: nums = [4,5,6,7,0,1,2], target = 0\nOutput: 4\n\nExample 2:\nInput: nums = [4,5,6,7,0,1,2], target = 3\nOutput: -1",
    approach:
      "• Binary search: check which half is sorted; if target lies in sorted half, search there; else search the other half. O(log n).",
  },
  "serialize and deserialize binary tree": {
    problem:
      "Design an algorithm to serialize and deserialize a binary tree. Serialize: convert tree to a string; deserialize: convert string back to the same tree.",
    constraints:
      "• Number of nodes in [0, 10^4].\n• -1000 ≤ Node.val ≤ 1000",
    examples:
      "Input: root = [1,2,3,null,null,4,5]\nSerialized form (e.g. \"1,2,null,null,3,4,null,null,5,null,null\")\nDeserialize should restore the same tree.",
    approach:
      "• Preorder DFS: serialize as \"val,left,right\" with \"null\" for null. Deserialize: read token, if null return null; else create node, recursively build left and right. O(n) both.",
  },
  "3sum closest": {
    problem:
      "Given an integer array nums and a target, find three integers in nums such that the sum is closest to target. Return the sum of the three integers.",
    constraints:
      "• 3 ≤ nums.length ≤ 500\n• -1000 ≤ nums[i] ≤ 1000\n• -10^4 ≤ target ≤ 10^4",
    examples:
      "Example 1:\nInput: nums = [-1,2,1,-4], target = 1\nOutput: 2\nExplanation: -1+2+1 = 2, closest to 1\n\nExample 2:\nInput: nums = [0,0,0], target = 1\nOutput: 0",
    approach:
      "• Sort array. Fix one index i; use two pointers (j, k) on the rest to find two numbers such that nums[i]+nums[j]+nums[k] is closest to target. O(n^2).",
  },
  "lowest common ancestor of a binary tree": {
    problem:
      "Given a binary tree and two nodes p and q, return the lowest common ancestor (LCA) of p and q. The LCA is the lowest node that has both p and q as descendants.",
    constraints:
      "• Number of nodes in [2, 10^5].\n• All Node.val are unique.\n• p and q exist in the tree.",
    examples:
      "Example 1:\nInput: root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1\nOutput: 3\n\nExample 2:\nInput: root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 4\nOutput: 5",
    approach:
      "• Recursive: if current is null or p or q, return current. Recurse left and right. If both return non-null, current is LCA; else return the non-null side. O(n).",
  },
  "clone linked list with next and random pointer": {
    problem:
      "A linked list of length n has each node with next and a random pointer (possibly null). Create a deep copy of the list.",
    constraints:
      "• 0 ≤ n ≤ 1000\n• -10^4 ≤ Node.val ≤ 10^4\n• random is null or points to a node in the list.",
    examples:
      "Input: head = [[7,null],[13,0],[11,4],[10,2],[1,0]]\nOutput: deep copy with same structure and random pointers.",
    approach:
      "• Two passes: first pass create copy of each node and map old → new. Second pass set next and random using the map. O(n) time and space.",
  },
  "product of array except self": {
    problem:
      "Given an integer array nums, return an array answer such that answer[i] is equal to the product of all elements of nums except nums[i]. Solve in O(n) without division.",
    constraints:
      "• 2 ≤ nums.length ≤ 10^5\n• -30 ≤ nums[i] ≤ 30",
    examples:
      "Example 1:\nInput: nums = [1,2,3,4]\nOutput: [24,12,8,6]\n\nExample 2:\nInput: nums = [-1,1,0,-3,3]\nOutput: [0,0,9,0,0]",
    approach:
      "• Prefix and suffix products: one pass for prefix (product of all left), one for suffix (product of all right). answer[i] = prefix[i] * suffix[i]. O(n) time, O(1) extra if output not counted.",
  },
  "kadane's algorithm (max subarray sum)": {
    problem:
      "Find the contiguous subarray with the largest sum (at least one element) and return that sum.",
    constraints:
      "• 1 ≤ nums.length ≤ 10^5\n• -10^4 ≤ nums[i] ≤ 10^4",
    examples:
      "Example 1:\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: [4,-1,2,1]\n\nExample 2:\nInput: nums = [1]\nOutput: 1",
    approach:
      "• current_sum = max(nums[i], current_sum + nums[i]); max_sum = max(max_sum, current_sum). O(n) time, O(1) space.",
  },
  "find peak element": {
    problem:
      "A peak element is one that is strictly greater than its neighbors. Given a 0-indexed integer array nums, find a peak element and return its index. Assume nums[-1] = nums[n] = -∞.",
    constraints:
      "• 1 ≤ nums.length ≤ 1000\n• -2^31 ≤ nums[i] ≤ 2^31 - 1\n• nums[i] ≠ nums[i+1] for valid i",
    examples:
      "Example 1:\nInput: nums = [1,2,3,1]\nOutput: 2\nExplanation: 3 is peak\n\nExample 2:\nInput: nums = [1,2,1,3,5,6,4]\nOutput: 5 (or 1)",
    approach:
      "• Binary search: if nums[mid] < nums[mid+1], peak is in right half; else in left half (including mid). O(log n).",
  },
  "peak element / find peak in array": {
    problem:
      "Find a peak element in an array (element greater than both neighbors). Array may have multiple peaks; return any valid index.",
    constraints:
      "• 1 ≤ n ≤ 1000\n• -2^31 ≤ nums[i] ≤ 2^31 - 1",
    examples:
      "Input: nums = [1,2,3,1]\nOutput: 2 (nums[2]=3 is peak)\n\nInput: nums = [1,2,1,3,5,6,4]\nOutput: 1 or 5",
    approach:
      "• Binary search: compare mid with mid+1; if mid < mid+1, search right; else search left. O(log n).",
  },
  "the celebrity problem": {
    problem:
      "In a party of n people, a celebrity is someone known by everyone but knows nobody. You have a helper knows(i, j) that returns true if i knows j. Find the celebrity in O(n) calls.",
    constraints:
      "• n ≥ 2\n• Exactly one celebrity or none.",
    examples:
      "Input: n = 3, knows(0,1)=true, knows(0,2)=true, knows(1,0)=true, knows(1,2)=true, knows(2,0)=false, knows(2,1)=false\nOutput: 2",
    approach:
      "• Pick candidate 0; for i from 1 to n-1, if candidate knows i, candidate = i. Then verify candidate is celebrity by checking everyone knows candidate and candidate knows nobody. O(n).",
  },
  "topological sort": {
    problem:
      "Given a directed acyclic graph (DAG) with n nodes and a list of edges, return any topological order of the nodes (linear ordering such that for every edge u→v, u comes before v).",
    constraints:
      "• 1 ≤ n ≤ 10^4\n• 0 ≤ edges.length ≤ 10^4\n• Graph is DAG.",
    examples:
      "Input: n = 4, edges = [[1,0],[2,0],[3,1],[3,2]]\nOutput: [0,1,2,3] or [0,2,1,3] etc.",
    approach:
      "• DFS: run DFS from each unvisited node; after visiting all descendants, push node to result. Reverse result. Or BFS (Kahn): in-degree count, queue nodes with 0 in-degree, reduce in-degree of neighbors. O(V+E).",
  },
  "course schedule": {
    problem:
      "There are numCourses courses (0 to numCourses-1). Some have prerequisites [a,b] meaning you must take b before a. Return true if you can finish all courses.",
    constraints:
      "• 1 ≤ numCourses ≤ 2000\n• 0 ≤ prerequisites.length ≤ 5000",
    examples:
      "Example 1:\nInput: numCourses = 2, prerequisites = [[1,0]]\nOutput: true\n\nExample 2:\nInput: numCourses = 2, prerequisites = [[1,0],[0,1]]\nOutput: false (cycle)",
    approach:
      "• Build graph and detect cycle (DFS with three states or Kahn’s in-degree). If cycle exists, return false. O(V+E).",
  },
};

/** Find static description for a question (exact or normalized match) */
export function getQuestionDescription(questionText: string): QuestionDescription | null {
  const trimmed = questionText.trim();
  if (DESCRIPTIONS[trimmed]) return DESCRIPTIONS[trimmed];
  const n = norm(trimmed);
  if (DESCRIPTIONS[n]) return DESCRIPTIONS[n];
  for (const key of Object.keys(DESCRIPTIONS)) {
    if (norm(key) === n) return DESCRIPTIONS[key];
    if (n.includes(norm(key)) || norm(key).includes(n)) return DESCRIPTIONS[key];
  }
  return null;
}
