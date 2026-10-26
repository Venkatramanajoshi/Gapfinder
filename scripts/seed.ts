import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { createAdminSupabase } from "../lib/db/supabase-admin";
import { generateEmbedding } from "../lib/ai/gemini";

async function runSeed() {
  console.log("Starting GapFinder AI Demo Seed...");

  const supabase = createAdminSupabase();
  const demoEmail = "demo@gapfinder.app";
  const demoPassword = "Demo@1234";

  // 1. Create or retrieve demo user via Supabase Auth Admin API
  let userId: string | null = null;

  const { data: createData, error: createError } =
    await supabase.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
    });

  if (createData?.user) {
    userId = createData.user.id;
    console.log(`Created demo user with ID: ${userId}`);
  } else if (createError) {
    const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) throw listErr;
    const existingUser = usersData?.users?.find(
      (u: any) => u.email?.toLowerCase() === demoEmail.toLowerCase()
    );
    if (existingUser) {
      userId = existingUser.id;
      const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
        password: demoPassword,
        email_confirm: true,
      });
      if (updateErr) throw updateErr;
      console.log(`Existing demo user found and synced: ${userId}`);
    }
  }

  if (!userId) {
    throw new Error("Could not create or find demo user in Supabase Auth.");
  }

  // Ensure profile row exists
  const { error: profErr } = await supabase
    .from("profiles")
    .upsert({ id: userId, email: demoEmail }, { onConflict: "id" });
  if (profErr) throw profErr;

  // Idempotent cleanup: delete demo user's old rows first
  // Note: quiz_questions cascades from quiz_attempts on delete
  await supabase.from("revision_plans").delete().eq("user_id", userId);
  await supabase.from("topic_scores").delete().eq("user_id", userId);
  await supabase.from("quiz_attempts").delete().eq("user_id", userId);
  await supabase.from("chunks").delete().eq("user_id", userId);
  await supabase.from("topics").delete().eq("user_id", userId);
  await supabase.from("documents").delete().eq("user_id", userId);

  // 2. Insert 3 Documents (Syllabus, Notes, Past Paper)
  const { data: syllabusDoc, error: d1Err } = await supabase
    .from("documents")
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      name: "CS201 Syllabus: Data Structures & Algorithms",
      type: "syllabus",
    })
    .select()
    .single();
  if (d1Err || !syllabusDoc) throw d1Err || new Error("Failed to insert syllabus document");

  const { data: notesDoc, error: d2Err } = await supabase
    .from("documents")
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      name: "Prof. Miller - DSA Lecture Notes (Units 1-4)",
      type: "notes",
    })
    .select()
    .single();
  if (d2Err || !notesDoc) throw d2Err || new Error("Failed to insert notes document");

  const { data: examDoc, error: d3Err } = await supabase
    .from("documents")
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      name: "Midterm Exam 2024 - Solved Questions",
      type: "past_paper",
    })
    .select()
    .single();
  if (d3Err || !examDoc) throw d3Err || new Error("Failed to insert past paper document");

  console.log("Inserted 3 course documents");

  // 3. Insert Topics Hierarchy
  const parentTopics = [
    { name: "Tree Structures" },
    { name: "Graph Algorithms" },
    { name: "Dynamic Programming" },
    { name: "Hash Tables & Addressing" },
  ];

  const parentMap: Record<string, string> = {};
  for (const pt of parentTopics) {
    const { data: p, error: pErr } = await supabase
      .from("topics")
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        name: pt.name,
        parent_id: null,
      })
      .select()
      .single();
    if (pErr || !p) throw pErr || new Error(`Failed to insert topic ${pt.name}`);
    parentMap[pt.name] = p.id;
  }

  const subtopicsList = [
    { parent: "Tree Structures", name: "Binary Search Trees & Balancing" },
    { parent: "Tree Structures", name: "AVL & Red-Black Trees" },
    { parent: "Graph Algorithms", name: "Breadth-First & Depth-First Search" },
    { parent: "Graph Algorithms", name: "Shortest Path & Dijkstra" },
    { parent: "Dynamic Programming", name: "Memoization vs Tabulation" },
    { parent: "Dynamic Programming", name: "0/1 Knapsack & Subsequence Problems" },
  ];

  const topicIdMap: Record<string, string> = { ...parentMap };
  for (const st of subtopicsList) {
    const parentId = parentMap[st.parent];
    const { data: sub, error: subErr } = await supabase
      .from("topics")
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        name: st.name,
        parent_id: parentId,
      })
      .select()
      .single();
    if (subErr || !sub) throw subErr || new Error(`Failed to insert subtopic ${st.name}`);
    topicIdMap[st.name] = sub.id;
  }

  console.log("Inserted 10 topics and subtopics");

  // 4. Insert Grounded Chunks with REAL 768-dim Gemini embeddings
  const rawChunks = [
    {
      docId: syllabusDoc.id,
      section: "Syllabus Unit 1: Binary Search Trees",
      text: "Binary Search Trees (BST) enforce the fundamental ordering property: for any given node with key K, all keys in its left subtree are strictly less than K, and all keys in its right subtree are strictly greater than K. An inorder traversal (Left-Root-Right) on a valid BST always prints all elements in strictly ascending sorted order.",
      topicId: topicIdMap["Binary Search Trees & Balancing"],
      page: 1,
    },
    {
      docId: notesDoc.id,
      section: "Lecture 4: Self-Balancing Trees",
      text: "AVL Trees are self-balancing binary search trees where the heights of the two child subtrees of any node differ by at most 1 (Balance Factor = Height(Left) - Height(Right) in {-1, 0, 1}). If balance is violated after insertion or deletion, rotation operations (Left Rotation, Right Rotation, Left-Right, Right-Left) restore O(log n) worst-case search time.",
      topicId: topicIdMap["AVL & Red-Black Trees"],
      page: 4,
    },
    {
      docId: notesDoc.id,
      section: "Lecture 7: Graph Traversals (BFS vs DFS)",
      text: "Breadth-First Search (BFS) traverses a graph level by level from the source vertex. BFS requires a First-In-First-Out (FIFO) queue data structure to track frontier vertices, guaranteeing shortest path finding in unweighted graphs. In contrast, Depth-First Search (DFS) explores as deep as possible along each branch before backtracking, using a Last-In-First-Out (LIFO) stack or recursion. The time complexity for both traversals using an adjacency list is O(V + E).",
      topicId: topicIdMap["Breadth-First & Depth-First Search"],
      page: 8,
    },
    {
      docId: examDoc.id,
      section: "Midterm 2024 Question 3: Dynamic Programming Concepts",
      text: "Dynamic Programming (DP) is applicable only when a problem exhibits both Optimal Substructure and Overlapping Subproblems. Memoization is a top-down approach that caches results of recursive calls in a hash table or array. Tabulation is a bottom-up approach that iteratively solves all subproblems starting from base cases and fills an n-dimensional table.",
      topicId: topicIdMap["Memoization vs Tabulation"],
      page: 2,
    },
    {
      docId: notesDoc.id,
      section: "Lecture 11: 0/1 Knapsack Problem",
      text: "In the 0/1 Knapsack problem, items cannot be broken into fractions. Given capacity W and n items with values v_i and weights w_i, the recurrence relation is: DP[i][w] = DP[i-1][w] if w_i > w, else max(DP[i-1][w], v_i + DP[i-1][w - w_i]). The dynamic programming state table requires O(n * W) time and space complexity.",
      topicId: topicIdMap["0/1 Knapsack & Subsequence Problems"],
      page: 14,
    },
    {
      docId: notesDoc.id,
      section: "Lecture 3: Hash Tables & Open Addressing",
      text: "Hash Tables provide expected O(1) average lookup time. When hash collisions occur, two main paradigms exist: Separate Chaining (each bucket holds a linked list) and Open Addressing (probing inside the array). Linear Probing searches subsequent slots with index (hash(k) + i) % m, which is susceptible to primary clustering.",
      topicId: topicIdMap["Hash Tables & Addressing"],
      page: 5,
    },
  ];

  const insertedChunkIds: string[] = [];
  for (const c of rawChunks) {
    console.log(`Generating 768-dim Gemini embedding for "${c.section}"...`);
    const embedding = await generateEmbedding(c.text);
    const { data: chunkRow, error: cErr } = await supabase
      .from("chunks")
      .insert({
        id: crypto.randomUUID(),
        document_id: c.docId,
        user_id: userId,
        content: c.text,
        section_label: c.section,
        page: c.page,
        topic_id: c.topicId,
        embedding,
      })
      .select()
      .single();
    if (cErr || !chunkRow) throw cErr || new Error("Failed to insert chunk");
    insertedChunkIds.push(chunkRow.id);
  }

  console.log(`Inserted ${insertedChunkIds.length} chunks with 768-dim embeddings`);

  // 5. Insert 3 Quiz Attempts (38%, 55%, 72.5%) with questions and topic_scores
  const { data: att1, error: a1Err } = await supabase
    .from("quiz_attempts")
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      score: 38.0,
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    })
    .select()
    .single();
  if (a1Err || !att1) throw a1Err || new Error("Failed to insert attempt 1");

  const { data: att2, error: a2Err } = await supabase
    .from("quiz_attempts")
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      score: 55.0,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    })
    .select()
    .single();
  if (a2Err || !att2) throw a2Err || new Error("Failed to insert attempt 2");

  const { data: att3, error: a3Err } = await supabase
    .from("quiz_attempts")
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      score: 72.5,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    })
    .select()
    .single();
  if (a3Err || !att3) throw a3Err || new Error("Failed to insert attempt 3");

  const { error: qqErr } = await supabase.from("quiz_questions").insert([
    {
      id: crypto.randomUUID(),
      attempt_id: att3.id,
      topic_id: topicIdMap["Binary Search Trees & Balancing"],
      question:
        "Which traversal of a valid Binary Search Tree is guaranteed to visit all node keys in strictly ascending sorted order?",
      options: [
        "Preorder (Root-Left-Right)",
        "Inorder (Left-Root-Right)",
        "Postorder (Left-Right-Root)",
        "Level-order (BFS)",
      ],
      correct_answer: "Inorder (Left-Root-Right)",
      source_chunk_id: insertedChunkIds[0],
      user_answer: "Inorder (Left-Root-Right)",
      is_correct: true,
      explanation:
        "An inorder traversal (Left-Root-Right) on a valid BST always prints all elements in strictly ascending sorted order.",
      citation_quote:
        "An inorder traversal (Left-Root-Right) on a valid BST always prints all elements in strictly ascending sorted order.",
    },
    {
      id: crypto.randomUUID(),
      attempt_id: att3.id,
      topic_id: topicIdMap["Breadth-First & Depth-First Search"],
      question:
        "According to your notes, what data structure does Breadth-First Search (BFS) utilize, and what does it guarantee in unweighted graphs?",
      options: [
        "LIFO Stack, guarantees cycle detection",
        "FIFO Queue, guarantees shortest path finding",
        "Priority Queue, guarantees minimum spanning tree",
        "Recursive call stack, guarantees topological sort",
      ],
      correct_answer: "FIFO Queue, guarantees shortest path finding",
      source_chunk_id: insertedChunkIds[2],
      user_answer: "LIFO Stack, guarantees cycle detection",
      is_correct: false,
      explanation:
        "BFS requires a First-In-First-Out (FIFO) queue data structure and guarantees shortest path finding in unweighted graphs.",
      citation_quote:
        "BFS requires a First-In-First-Out (FIFO) queue data structure to track frontier vertices, guaranteeing shortest path finding in unweighted graphs.",
    },
    {
      id: crypto.randomUUID(),
      attempt_id: att3.id,
      topic_id: topicIdMap["Memoization vs Tabulation"],
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
      source_chunk_id: insertedChunkIds[3],
      user_answer: "Memoization is strictly iterative, while Tabulation relies on recursion",
      is_correct: false,
      explanation:
        "Memoization is top-down caching of recursive calls. Tabulation is a bottom-up iterative table filling approach.",
      citation_quote:
        "Memoization is a top-down approach that caches results of recursive calls in a hash table or array. Tabulation is a bottom-up approach that iteratively solves all subproblems",
    },
    {
      id: crypto.randomUUID(),
      attempt_id: att3.id,
      topic_id: topicIdMap["Hash Tables & Addressing"],
      question:
        "In open addressing hash tables, what collision resolution technique computes slot index using (hash(k) + i) % m and suffers from primary clustering?",
      options: [
        "Separate Chaining",
        "Linear Probing",
        "Double Hashing",
        "Consistent Hashing",
      ],
      correct_answer: "Linear Probing",
      source_chunk_id: insertedChunkIds[5],
      user_answer: "Linear Probing",
      is_correct: true,
      explanation:
        "Linear Probing searches subsequent slots with index (hash(k) + i) % m, which is susceptible to primary clustering.",
      citation_quote:
        "Linear Probing searches subsequent slots with index (hash(k) + i) % m, which is susceptible to primary clustering.",
    },
  ]);
  if (qqErr) throw qqErr;

  const { error: tsErr } = await supabase.from("topic_scores").insert([
    {
      id: crypto.randomUUID(),
      user_id: userId,
      topic_id: topicIdMap["Binary Search Trees & Balancing"],
      attempt_id: att3.id,
      score: 100,
      reason: "Flawless grasp of Binary Search Tree ordering invariants and traversal mechanisms.",
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      topic_id: topicIdMap["Hash Tables & Addressing"],
      attempt_id: att3.id,
      score: 75,
      reason: "Strong understanding of open addressing and collision resolution strategies.",
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      topic_id: topicIdMap["AVL & Red-Black Trees"],
      attempt_id: att3.id,
      score: 50,
      reason: "Understands balance factors but missed double rotation questions.",
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      topic_id: topicIdMap["Breadth-First & Depth-First Search"],
      attempt_id: att3.id,
      score: 25,
      reason: "Confounded FIFO queue BFS mechanics with LIFO DFS stack backtracking semantics.",
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      topic_id: topicIdMap["Memoization vs Tabulation"],
      attempt_id: att3.id,
      score: 20,
      reason: "Struggles to differentiate top-down recursive memoization from bottom-up iterative DP tabulation.",
    },
  ]);
  if (tsErr) throw tsErr;

  // 6. Insert Revision Plan (60% weak, 30% medium, 10% strong)
  const { error: rpErr } = await supabase.from("revision_plans").insert({
    id: crypto.randomUUID(),
    user_id: userId,
    days_available: 5,
    hours_per_day: 3,
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
  });
  if (rpErr) throw rpErr;

  console.log("==================================================");
  console.log("Seed finished successfully!");
  console.log(`Demo Credentials: ${demoEmail} / ${demoPassword}`);
  console.log("==================================================");
}

runSeed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
