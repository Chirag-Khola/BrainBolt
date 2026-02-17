import { createHash } from "node:crypto";

const mk = (id: string, difficulty: number, prompt: string, choices: string[], correctAnswer: string, tags: string[]) => ({
  id,
  difficulty,
  prompt,
  choices,
  correctAnswer,
  correctAnswerHash: createHash("sha256").update(correctAnswer).digest("hex"),
  tags
});

export const questions = [
  mk("q1", 1, "What is 2 + 2?", ["3", "4", "5", "6"], "4", ["math", "arithmetic"]),
  mk("q2", 1, "Which planet is known as the Red Planet?", ["Earth", "Venus", "Mars", "Jupiter"], "Mars", ["science"]),
  mk("q3", 2, "What is the capital of Japan?", ["Seoul", "Tokyo", "Osaka", "Beijing"], "Tokyo", ["geography"]),
  mk("q4", 2, "What is 15% of 200?", ["20", "30", "40", "50"], "30", ["math"]),
  mk("q5", 3, "In JavaScript, which keyword declares a block-scoped variable?", ["var", "let", "const", "both let and const"], "both let and const", ["coding"]),
  mk("q6", 3, "Who wrote '1984'?", ["George Orwell", "Aldous Huxley", "Mark Twain", "Tolkien"], "George Orwell", ["literature"]),
  mk("q7", 4, "What is the derivative of x^2?", ["x", "2x", "x^2", "2"], "2x", ["math"]),
  mk("q8", 4, "Which HTTP status code means 'Unauthorized'?", ["200", "401", "403", "404"], "401", ["web"]),
  mk("q9", 5, "What is the time complexity of binary search?", ["O(n)", "O(log n)", "O(n log n)", "O(1)"], "O(log n)", ["algorithms"]),
  mk("q10", 5, "Which gas is most abundant in Earth's atmosphere?", ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], "Nitrogen", ["science"]),
  mk("q11", 6, "What does ACID stand for in databases (A)?", ["Atomicity", "Availability", "Accuracy", "Aggregation"], "Atomicity", ["db"]),
  mk("q12", 6, "Evaluate integral of 1/x dx.", ["x", "ln|x| + C", "1/(x^2)", "e^x"], "ln|x| + C", ["math"]),
  mk("q13", 7, "Which sorting algorithm is stable by default?", ["Quick sort", "Heap sort", "Merge sort", "Selection sort"], "Merge sort", ["algorithms"]),
  mk("q14", 7, "What is CAP theorem's 'P'?", ["Performance", "Partition tolerance", "Persistence", "Priority"], "Partition tolerance", ["distributed"]),
  mk("q15", 8, "In React, what hook avoids re-computation of expensive values?", ["useState", "useMemo", "useEffect", "useRef"], "useMemo", ["react"]),
  mk("q16", 8, "Which isolation level prevents phantom reads?", ["Read Uncommitted", "Read Committed", "Repeatable Read", "Serializable"], "Serializable", ["db"]),
  mk("q17", 9, "What is the output of a perfect hash function collision rate?", ["High", "Variable", "Zero", "Unknown"], "Zero", ["cs"]),
  mk("q18", 9, "Which protocol underlies HTTP/3?", ["TCP", "UDP (QUIC)", "SCTP", "ICMP"], "UDP (QUIC)", ["network"]),
  mk("q19", 10, "Given Amdahl’s Law, speedup is most constrained by:", ["Parallel part", "Serial part", "Clock speed", "Cache size"], "Serial part", ["systems"]),
  mk("q20", 10, "Which consensus tolerates byzantine faults in partially synchronous networks?", ["Raft", "Paxos", "PBFT", "2PC"], "PBFT", ["distributed"])
];
