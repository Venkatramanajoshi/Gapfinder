import fs from "fs";
import path from "path";
import crypto from "crypto";
import { cosineSimilarity } from "@/lib/ai/gemini";

const DB_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DB_DIR, "gapfinder-pg.json");

export interface DbState {
  users: {
    id: string;
    email: string;
    password: string;
    created_at: string;
  }[];
  profiles: {
    id: string;
    email: string;
    created_at: string;
  }[];
  documents: {
    id: string;
    user_id: string;
    name: string;
    type: "syllabus" | "notes" | "past_paper";
    created_at: string;
  }[];
  topics: {
    id: string;
    user_id: string;
    name: string;
    parent_id: string | null;
    created_at: string;
  }[];
  chunks: {
    id: string;
    document_id: string;
    user_id: string;
    content: string;
    section_label: string;
    page: number;
    topic_id: string | null;
    embedding: number[];
    created_at: string;
  }[];
  quiz_attempts: {
    id: string;
    user_id: string;
    score: number;
    created_at: string;
  }[];
  quiz_questions: {
    id: string;
    attempt_id: string;
    topic_id: string;
    question: string;
    options: string[];
    correct_answer: string;
    source_chunk_id: string | null;
    user_answer?: string | null;
    is_correct?: boolean | null;
    explanation: string;
    citation_quote?: string;
    created_at: string;
  }[];
  topic_scores: {
    id: string;
    user_id: string;
    topic_id: string;
    attempt_id: string;
    score: number;
    reason: string;
    created_at: string;
  }[];
  revision_plans: {
    id: string;
    user_id: string;
    days_available: number;
    hours_per_day: number;
    plan_json: any;
    created_at: string;
  }[];
}

function deterministicUnitVector(seedText: string): number[] {
  const vec = new Array(768).fill(0);
  const words = seedText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const hash = crypto.createHash("sha256").update(words[i]).digest();
    for (let b = 0; b < 8; b++) {
      const idx = ((hash[b * 2] << 8) | hash[b * 2 + 1]) % 768;
      const sign = (hash[b] & 1) === 0 ? 1 : -1;
      vec[idx] += sign * (1 / (1 + (i % 4)));
    }
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

function createInitialSeedState(): DbState {
  const now = new Date().toISOString();
  const userId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const demoEmail = "demo@gapfinder.app";

  const docSyllabusId = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const docNotesId = "b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a12";
  const docExamId = "b3eebc99-9c0b-4ef8-bb6d-6bb9bd380a13";

  const tTreesId = "c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";
  const tGraphsId = "c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a02";
  const tDpId = "c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a03";
  const tHashId = "c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a04";

  const tBstId = "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a05";
  const tAvlId = "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a06";
  const tBfsId = "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a07";
  const tDijkstraId = "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a08";
  const tMemoId = "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a09";
  const tKnapsackId = "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a10";

  const chk1Id = "d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";
  const chk2Id = "d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a02";
  const chk3Id = "d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a03";
  const chk4Id = "d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a04";
  const chk5Id = "d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a05";
  const chk6Id = "d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a06";

  const att1Id = "e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";
  const att2Id = "e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a02";
  const att3Id = "e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a03";

  const c1Text =
    "Binary Search Trees (BST) enforce the fundamental ordering property: for any given node with key K, all keys in its left subtree are strictly less than K, and all keys in its right subtree are strictly greater than K. An inorder traversal (Left-Root-Right) on a valid BST always prints all elements in strictly ascending sorted order.";
  const c2Text =
    "AVL Trees are self-balancing binary search trees where the heights of the two child subtrees of any node differ by at most 1 (Balance Factor = Height(Left) - Height(Right) in {-1, 0, 1}). If balance is violated after insertion or deletion, rotation operations (Left Rotation, Right Rotation, Left-Right, Right-Left) restore O(log n) worst-case search time.";
  const c3Text =
    "Breadth-First Search (BFS) traverses a graph level by level from the source vertex. BFS requires a First-In-First-Out (FIFO) queue data structure to track frontier vertices, guaranteeing shortest path finding in unweighted graphs. In contrast, Depth-First Search (DFS) explores as deep as possible along each branch before backtracking, using a Last-In-First-Out (LIFO) stack or recursion. The time complexity for both traversals using an adjacency list is O(V + E).";
  const c4Text =
    "Dynamic Programming (DP) is applicable only when a problem exhibits both Optimal Substructure and Overlapping Subproblems. Memoization is a top-down approach that caches results of recursive calls in a hash table or array. Tabulation is a bottom-up approach that iteratively solves all subproblems starting from base cases and fills an n-dimensional table.";
  const c5Text =
    "In the 0/1 Knapsack problem, items cannot be broken into fractions. Given capacity W and n items with values v_i and weights w_i, the recurrence relation is: DP[i][w] = DP[i-1][w] if w_i > w, else max(DP[i-1][w], v_i + DP[i-1][w - w_i]). The dynamic programming state table requires O(n * W) time and space complexity.";
  const c6Text =
    "Hash Tables provide expected O(1) average lookup time. When hash collisions occur, two main paradigms exist: Separate Chaining (each bucket holds a linked list) and Open Addressing (probing inside the array). Linear Probing searches subsequent slots with index (hash(k) + i) % m, which is susceptible to primary clustering.";

  return {
    users: [
      {
        id: userId,
        email: demoEmail,
        password: "Demo@1234",
        created_at: now,
      },
    ],
    profiles: [
      {
        id: userId,
        email: demoEmail,
        created_at: now,
      },
    ],
    documents: [
      {
        id: docSyllabusId,
        user_id: userId,
        name: "CS201 Syllabus: Data Structures & Algorithms",
        type: "syllabus",
        created_at: now,
      },
      {
        id: docNotesId,
        user_id: userId,
        name: "Prof. Miller - DSA Lecture Notes (Units 1-4)",
        type: "notes",
        created_at: now,
      },
      {
        id: docExamId,
        user_id: userId,
        name: "Midterm Exam 2024 - Solved Questions",
        type: "past_paper",
        created_at: now,
      },
    ],
    topics: [
      { id: tTreesId, user_id: userId, name: "Tree Structures", parent_id: null, created_at: now },
      { id: tGraphsId, user_id: userId, name: "Graph Algorithms", parent_id: null, created_at: now },
      { id: tDpId, user_id: userId, name: "Dynamic Programming", parent_id: null, created_at: now },
      { id: tHashId, user_id: userId, name: "Hash Tables & Addressing", parent_id: null, created_at: now },
      { id: tBstId, user_id: userId, name: "Binary Search Trees & Balancing", parent_id: tTreesId, created_at: now },
      { id: tAvlId, user_id: userId, name: "AVL & Red-Black Trees", parent_id: tTreesId, created_at: now },
      { id: tBfsId, user_id: userId, name: "Breadth-First & Depth-First Search", parent_id: tGraphsId, created_at: now },
      { id: tDijkstraId, user_id: userId, name: "Shortest Path & Dijkstra", parent_id: tGraphsId, created_at: now },
      { id: tMemoId, user_id: userId, name: "Memoization vs Tabulation", parent_id: tDpId, created_at: now },
      { id: tKnapsackId, user_id: userId, name: "0/1 Knapsack & Subsequence Problems", parent_id: tDpId, created_at: now },
    ],
    chunks: [
      {
        id: chk1Id,
        document_id: docSyllabusId,
        user_id: userId,
        content: c1Text,
        section_label: "Syllabus Unit 1: Binary Search Trees",
        page: 1,
        topic_id: tBstId,
        embedding: deterministicUnitVector(c1Text),
        created_at: now,
      },
      {
        id: chk2Id,
        document_id: docNotesId,
        user_id: userId,
        content: c2Text,
        section_label: "Lecture 4: Self-Balancing Trees",
        page: 4,
        topic_id: tAvlId,
        embedding: deterministicUnitVector(c2Text),
        created_at: now,
      },
      {
        id: chk3Id,
        document_id: docNotesId,
        user_id: userId,
        content: c3Text,
        section_label: "Lecture 7: Graph Traversals (BFS vs DFS)",
        page: 8,
        topic_id: tBfsId,
        embedding: deterministicUnitVector(c3Text),
        created_at: now,
      },
      {
        id: chk4Id,
        document_id: docExamId,
        user_id: userId,
        content: c4Text,
        section_label: "Midterm 2024 Question 3: Dynamic Programming Concepts",
        page: 2,
        topic_id: tMemoId,
        embedding: deterministicUnitVector(c4Text),
        created_at: now,
      },
      {
        id: chk5Id,
        document_id: docNotesId,
        user_id: userId,
        content: c5Text,
        section_label: "Lecture 11: 0/1 Knapsack Problem",
        page: 14,
        topic_id: tKnapsackId,
        embedding: deterministicUnitVector(c5Text),
        created_at: now,
      },
      {
        id: chk6Id,
        document_id: docNotesId,
        user_id: userId,
        content: c6Text,
        section_label: "Lecture 3: Hash Tables & Open Addressing",
        page: 5,
        topic_id: tHashId,
        embedding: deterministicUnitVector(c6Text),
        created_at: now,
      },
    ],
    quiz_attempts: [
      {
        id: att1Id,
        user_id: userId,
        score: 38.0,
        created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      {
        id: att2Id,
        user_id: userId,
        score: 55.0,
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: att3Id,
        user_id: userId,
        score: 72.5,
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
    quiz_questions: [
      {
        id: crypto.randomUUID(),
        attempt_id: att3Id,
        topic_id: tBstId,
        question:
          "Which traversal of a valid Binary Search Tree is guaranteed to visit all node keys in strictly ascending sorted order?",
        options: [
          "Preorder (Root-Left-Right)",
          "Inorder (Left-Root-Right)",
          "Postorder (Left-Right-Root)",
          "Level-order (BFS)",
        ],
        correct_answer: "Inorder (Left-Root-Right)",
        source_chunk_id: chk1Id,
        user_answer: "Inorder (Left-Root-Right)",
        is_correct: true,
        explanation:
          "An inorder traversal (Left-Root-Right) on a valid BST always prints all elements in strictly ascending sorted order.",
        citation_quote:
          "An inorder traversal (Left-Root-Right) on a valid BST always prints all elements in strictly ascending sorted order.",
        created_at: now,
      },
      {
        id: crypto.randomUUID(),
        attempt_id: att3Id,
        topic_id: tBfsId,
        question:
          "According to your notes, what data structure does Breadth-First Search (BFS) utilize, and what does it guarantee in unweighted graphs?",
        options: [
          "LIFO Stack, guarantees cycle detection",
          "FIFO Queue, guarantees shortest path finding",
          "Priority Queue, guarantees minimum spanning tree",
          "Recursive call stack, guarantees topological sort",
        ],
        correct_answer: "FIFO Queue, guarantees shortest path finding",
        source_chunk_id: chk3Id,
        user_answer: "LIFO Stack, guarantees cycle detection",
        is_correct: false,
        explanation:
          "BFS requires a First-In-First-Out (FIFO) queue data structure and guarantees shortest path finding in unweighted graphs.",
        citation_quote:
          "BFS requires a First-In-First-Out (FIFO) queue data structure to track frontier vertices, guaranteeing shortest path finding in unweighted graphs.",
        created_at: now,
      },
      {
        id: crypto.randomUUID(),
        attempt_id: att3Id,
        topic_id: tMemoId,
        question:
          "What fundamental distinction does the midterm exam review make between Memoization and Tabulation?",
        options: [
          "Memoization is top-down caching of recursive calls, while Tabulation is bottom-up iterative table filling",
          "Memoization uses O(n!) permutations, while Tabulation requires greedy selection",
          "Memoization is strictly iterative, while Tabulation relies on recursion",
          "Memoization applies only to trees, while Tabulation applies only to graphs",
        ],
        correct_answer:
          "Memoization is top-down caching of recursive calls, while Tabulation is bottom-up iterative table filling",
        source_chunk_id: chk4Id,
        user_answer: "Memoization is strictly iterative, while Tabulation relies on recursion",
        is_correct: false,
        explanation:
          "Memoization is top-down caching of recursive calls. Tabulation is a bottom-up iterative table filling approach.",
        citation_quote:
          "Memoization is a top-down approach that caches results of recursive calls in a hash table or array. Tabulation is a bottom-up approach that iteratively solves all subproblems",
        created_at: now,
      },
      {
        id: crypto.randomUUID(),
        attempt_id: att3Id,
        topic_id: tHashId,
        question:
          "In open addressing hash tables, what collision resolution technique computes slot index using (hash(k) + i) % m and suffers from primary clustering?",
        options: [
          "Separate Chaining",
          "Linear Probing",
          "Double Hashing",
          "Consistent Hashing",
        ],
        correct_answer: "Linear Probing",
        source_chunk_id: chk6Id,
        user_answer: "Linear Probing",
        is_correct: true,
        explanation:
          "Linear Probing searches subsequent slots with index (hash(k) + i) % m, which is susceptible to primary clustering.",
        citation_quote:
          "Linear Probing searches subsequent slots with index (hash(k) + i) % m, which is susceptible to primary clustering.",
        created_at: now,
      },
    ],
    topic_scores: [
      {
        id: crypto.randomUUID(),
        user_id: userId,
        topic_id: tBstId,
        attempt_id: att3Id,
        score: 100,
        reason: "Flawless grasp of Binary Search Tree ordering invariants and traversal mechanisms.",
        created_at: now,
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        topic_id: tHashId,
        attempt_id: att3Id,
        score: 75,
        reason: "Strong understanding of open addressing and collision resolution strategies.",
        created_at: now,
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        topic_id: tAvlId,
        attempt_id: att3Id,
        score: 50,
        reason: "Understands balance factors but missed double rotation questions.",
        created_at: now,
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        topic_id: tBfsId,
        attempt_id: att3Id,
        score: 25,
        reason: "Confounded FIFO queue BFS mechanics with LIFO DFS stack backtracking semantics.",
        created_at: now,
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        topic_id: tMemoId,
        attempt_id: att3Id,
        score: 20,
        reason: "Struggles to differentiate top-down recursive memoization from bottom-up iterative DP tabulation.",
        created_at: now,
      },
    ],
    revision_plans: [
      {
        id: crypto.randomUUID(),
        user_id: userId,
        days_available: 5,
        hours_per_day: 3,
        created_at: now,
        plan_json: [
          {
            day: 1,
            theme: "Deep Dive: Graph Traversal Mechanisms",
            allocated_hours: 3,
            tasks: [
              {
                topic_name: "Breadth-First & Depth-First Search",
                category: "weak",
                activity: "Trace BFS queue state on an unweighted 6-node graph. Contrast with recursive DFS call stack.",
                duration_minutes: 100,
              },
              {
                topic_name: "Breadth-First & Depth-First Search",
                category: "weak",
                activity: "Solve Midterm practice question: BFS shortest-path distance recording.",
                duration_minutes: 80,
              },
            ],
          },
          {
            day: 2,
            theme: "Dynamic Programming Foundations: Top-Down vs Bottom-Up",
            allocated_hours: 3,
            tasks: [
              {
                topic_name: "Memoization vs Tabulation",
                category: "weak",
                activity: "Implement Fibonacci and 0/1 Knapsack recursively with memoization, then rewrite using DP table.",
                duration_minutes: 110,
              },
              {
                topic_name: "0/1 Knapsack & Subsequence Problems",
                category: "weak",
                activity: "Work through Lecture 11 recurrence relation and fill out 2D capacity state matrix.",
                duration_minutes: 70,
              },
            ],
          },
          {
            day: 3,
            theme: "Consolidation & Tree Balancing",
            allocated_hours: 3,
            tasks: [
              {
                topic_name: "AVL & Red-Black Trees",
                category: "medium",
                activity: "Draw single Right/Left rotations and complex Left-Right double rotations after insertion.",
                duration_minutes: 80,
              },
              {
                topic_name: "Memoization vs Tabulation",
                category: "weak",
                activity: "Diagnostic re-check on DP state transitions and edge boundary conditions.",
                duration_minutes: 70,
              },
              {
                topic_name: "Tree Structures",
                category: "strong",
                activity: "Speed run 5 BST inorder traversal and search complexity problems.",
                duration_minutes: 30,
              },
            ],
          },
          {
            day: 4,
            theme: "Hash Tables & Mixed Problem Practice",
            allocated_hours: 3,
            tasks: [
              {
                topic_name: "Hash Tables & Addressing",
                category: "strong",
                activity: "Review open addressing vs separate chaining and linear probing primary clustering.",
                duration_minutes: 45,
              },
              {
                topic_name: "Graph Algorithms",
                category: "weak",
                activity: "Simulate Dijkstra vs BFS on weighted vs unweighted graphs.",
                duration_minutes: 85,
              },
              {
                topic_name: "Breadth-First & Depth-First Search",
                category: "weak",
                activity: "Timed drill on connected components and bipartite graph detection.",
                duration_minutes: 50,
              },
            ],
          },
          {
            day: 5,
            theme: "Comprehensive Simulation & Readiness Check",
            allocated_hours: 3,
            tasks: [
              {
                topic_name: "Comprehensive Diagnostic",
                category: "weak",
                activity: "Retake full GapFinder diagnostic quiz covering all topics.",
                duration_minutes: 60,
              },
              {
                topic_name: "Targeted Weak Point Remediation",
                category: "weak",
                activity: "Consult Grounded Assistant on any remaining erroneous concepts.",
                duration_minutes: 80,
              },
              {
                topic_name: "High-level Invariant Review",
                category: "strong",
                activity: "Quick review of Big-O complexity cheat sheet across all units.",
                duration_minutes: 40,
              },
            ],
          },
        ],
      },
    ],
  };
}

export function readDb(): DbState {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialSeedState();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw) as DbState;
  } catch {
    const initial = createInitialSeedState();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
}

export function writeDb(state: DbState) {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
}

class LocalQueryBuilder {
  private table: keyof DbState;
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private selectCols = "*";
  private selectOpts?: { count?: "exact"; head?: boolean };
  private payload: any = null;
  private filters: ((row: any, db: DbState) => boolean)[] = [];
  private orderField: string | null = null;
  private orderAsc = true;
  private limitNum: number | null = null;
  private singleMode: "none" | "single" | "maybeSingle" = "none";

  constructor(table: keyof DbState) {
    this.table = table;
  }

  select(cols = "*", opts?: { count?: "exact"; head?: boolean }) {
    if (this.op === "select") {
      this.selectCols = cols;
      this.selectOpts = opts;
    } else {
      this.selectCols = cols;
    }
    return this;
  }

  insert(rowsOrRow: any) {
    this.op = "insert";
    this.payload = Array.isArray(rowsOrRow) ? rowsOrRow : [rowsOrRow];
    return this;
  }

  update(values: any) {
    this.op = "update";
    this.payload = values;
    return this;
  }

  upsert(row: any, _opts?: any) {
    this.op = "upsert";
    this.payload = row;
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  eq(field: string, val: any) {
    this.filters.push((row, db) => {
      if (field === "documents.type" && this.table === "chunks") {
        const doc = db.documents.find((d) => d.id === row.document_id);
        return doc?.type === val;
      }
      return row[field] === val;
    });
    return this;
  }

  in(field: string, vals: any[]) {
    const set = new Set(vals);
    this.filters.push((row) => set.has(row[field]));
    return this;
  }

  is(field: string, val: any) {
    this.filters.push((row) => (val === null ? row[field] === null || row[field] === undefined : row[field] === val));
    return this;
  }

  order(field: string, opts?: { ascending?: boolean }) {
    this.orderField = field;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }

  limit(n: number) {
    this.limitNum = n;
    return this;
  }

  single() {
    this.singleMode = "single";
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this;
  }

  private execute(): { data: any; error: any; count?: number } {
    const db = readDb();
    const list = (db[this.table] as any[]) || [];

    if (this.op === "insert") {
      const now = new Date().toISOString();
      const inserted = this.payload.map((item: any) => ({
        id: item.id || crypto.randomUUID(),
        created_at: item.created_at || now,
        ...item,
      }));
      (db[this.table] as any[]).push(...inserted);
      writeDb(db);
      const out =
        this.singleMode !== "none" ? inserted[0] || null : inserted;
      return { data: out, error: null };
    }

    if (this.op === "upsert") {
      const now = new Date().toISOString();
      const item = {
        id: this.payload.id || crypto.randomUUID(),
        created_at: this.payload.created_at || now,
        ...this.payload,
      };
      const existingIdx = list.findIndex((r) => r.id === item.id);
      if (existingIdx >= 0) {
        list[existingIdx] = { ...list[existingIdx], ...item };
      } else {
        list.push(item);
      }
      writeDb(db);
      const out = this.singleMode !== "none" ? item : [item];
      return { data: out, error: null };
    }

    if (this.op === "update") {
      const updated: any[] = [];
      for (let i = 0; i < list.length; i++) {
        if (this.filters.every((fn) => fn(list[i], db))) {
          list[i] = { ...list[i], ...this.payload };
          updated.push(list[i]);
        }
      }
      writeDb(db);
      const out = this.singleMode !== "none" ? updated[0] || null : updated;
      return { data: out, error: null };
    }

    if (this.op === "delete") {
      const toDelete = list.filter((r) => this.filters.every((fn) => fn(r, db)));
      if (this.table === "quiz_attempts") {
        const deletedAttemptIds = new Set(toDelete.map((a) => a.id));
        db.quiz_questions = db.quiz_questions.filter(
          (qq) => !deletedAttemptIds.has(qq.attempt_id)
        );
      }
      (db[this.table] as any[]) = list.filter(
        (r) => !this.filters.every((fn) => fn(r, db))
      );
      writeDb(db);
      return { data: toDelete, error: null };
    }

    // SELECT
    let matched = list.filter((r) => this.filters.every((fn) => fn(r, db)));
    const totalCount = matched.length;

    if (this.selectOpts?.head) {
      return { data: null, error: null, count: totalCount };
    }

    if (this.orderField) {
      const f = this.orderField;
      const dir = this.orderAsc ? 1 : -1;
      matched = [...matched].sort((a, b) => {
        if (a[f] < b[f]) return -1 * dir;
        if (a[f] > b[f]) return 1 * dir;
        return 0;
      });
    }

    if (this.limitNum !== null) {
      matched = matched.slice(0, this.limitNum);
    }

    // Join chunks if requested on quiz_questions
    if (this.table === "quiz_questions" && this.selectCols.includes("chunks(")) {
      matched = matched.map((q) => ({
        ...q,
        chunks: db.chunks.find((c) => c.id === q.source_chunk_id) || null,
      }));
    }

    if (this.singleMode === "single") {
      if (matched.length === 0) {
        return { data: null, error: { message: "Row not found" } };
      }
      return { data: matched[0], error: null };
    }

    if (this.singleMode === "maybeSingle") {
      return { data: matched[0] || null, error: null };
    }

    return { data: matched, error: null, count: totalCount };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export function createLocalSupabaseServer(sessionUserId?: string | null) {
  return {
    auth: {
      async getUser() {
        if (!sessionUserId) {
          return { data: { user: null }, error: { message: "Not authenticated" } };
        }
        const db = readDb();
        const found = db.users.find((u) => u.id === sessionUserId);
        if (!found) {
          return { data: { user: null }, error: { message: "User not found" } };
        }
        return {
          data: {
            user: {
              id: found.id,
              email: found.email,
              created_at: found.created_at,
            },
          },
          error: null,
        };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const db = readDb();
        const found = db.users.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase()
        );
        if (!found || found.password !== password) {
          return {
            data: { user: null, session: null },
            error: { message: "Invalid email or password." },
          };
        }
        const userObj = {
          id: found.id,
          email: found.email,
          created_at: found.created_at,
        };
        return {
          data: { user: userObj, session: { access_token: found.id, user: userObj } },
          error: null,
        };
      },
      async signUp({ email, password }: { email: string; password: string }) {
        const db = readDb();
        const cleanEmail = email.trim().toLowerCase();
        const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
        if (existing) {
          return {
            data: { user: null, session: null },
            error: { message: "User with this email already exists." },
          };
        }
        const newUser = {
          id: crypto.randomUUID(),
          email: cleanEmail,
          password,
          created_at: new Date().toISOString(),
        };
        db.users.push(newUser);
        db.profiles.push({
          id: newUser.id,
          email: newUser.email,
          created_at: newUser.created_at,
        });
        writeDb(db);
        const userObj = {
          id: newUser.id,
          email: newUser.email,
          created_at: newUser.created_at,
        };
        return {
          data: { user: userObj, session: { access_token: newUser.id, user: userObj } },
          error: null,
        };
      },
      async signOut() {
        return { error: null };
      },
      admin: {
        async createUser({
          email,
          password,
        }: {
          email: string;
          password: string;
          email_confirm?: boolean;
        }) {
          const db = readDb();
          const cleanEmail = email.trim().toLowerCase();
          const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
          if (existing) {
            return {
              data: { user: null },
              error: { message: "User already registered" },
            };
          }
          const newUser = {
            id: crypto.randomUUID(),
            email: cleanEmail,
            password,
            created_at: new Date().toISOString(),
          };
          db.users.push(newUser);
          writeDb(db);
          return { data: { user: newUser }, error: null };
        },
        async listUsers() {
          const db = readDb();
          return { data: { users: db.users }, error: null };
        },
        async updateUserById(
          id: string,
          attrs: { password?: string; email_confirm?: boolean }
        ) {
          const db = readDb();
          const idx = db.users.findIndex((u) => u.id === id);
          if (idx < 0) {
            return { data: { user: null }, error: { message: "User not found" } };
          }
          if (attrs.password) {
            db.users[idx].password = attrs.password;
          }
          writeDb(db);
          return { data: { user: db.users[idx] }, error: null };
        },
      },
    },
    from(table: keyof DbState) {
      return new LocalQueryBuilder(table);
    },
    async rpc(
      fnName: string,
      args: { query_embedding: number[]; match_count: number; filter_user_id: string }
    ) {
      if (fnName !== "match_chunks") {
        return { data: null, error: { message: `Unknown RPC ${fnName}` } };
      }
      const db = readDb();
      const userChunks = db.chunks.filter((c) => c.user_id === args.filter_user_id);
      const scored = userChunks.map((c) => ({
        id: c.id,
        document_id: c.document_id,
        content: c.content,
        section_label: c.section_label,
        page: c.page,
        topic_id: c.topic_id,
        similarity: cosineSimilarity(args.query_embedding, c.embedding || []),
      }));
      scored.sort((a, b) => b.similarity - a.similarity);
      return {
        data: scored.slice(0, args.match_count),
        error: null,
      };
    },
  };
}
