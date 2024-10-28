import { ApolloServer } from "apollo-server";
import { LRUCache } from "lru-cache";
import { v4 as uuid } from "uuid";

// Schema definition
const typeDefs = `
  type Query {
    todos: [Todo]
		todo(id: String!): Todo
  }

	type Todo {
		id: String!
		description: String!
	}

	type Mutation {
		addTodo(description: String!): Todo
		updateTodo(id: String!, description: String!): Todo
	}
`;

type Todo = {
  id: string;
  description: string;
};

// LRU cache for storing to-do items
const cache = new LRUCache<Todo["id"], Todo["description"], unknown>({
  max: 25,
  ttl: 1000 * 60 * 5,
});

// Resolver definitions
const resolvers = {
  Query: {
    todos: () => {
      const todos: Todo[] = [];
      cache.forEach((description, id) => todos.push({ description, id }));
      return todos;
    },
    todo: (_: unknown, { id }: Todo) => {
      return { id, description: cache.get(id) };
    },
  },
  Mutation: {
    addTodo: (_: unknown, { description }: Todo) => {
      const id = uuid();
      const todo = { description, id };
      cache.set(id, description);
      return todo;
    },
    updateTodo: (_: unknown, { description, id }: Todo) => {
      const todo = { description, id };
      cache.set(id, description);
      return todo;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
