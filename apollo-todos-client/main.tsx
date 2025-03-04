import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  useQuery,
  useMutation,
  gql,
} from "@apollo/client";

const serverURL = "http://localhost:4000/";

const client = new ApolloClient({
  uri: serverURL,
  cache: new InMemoryCache(),
});

const ADD_TODO = gql`
  mutation AddTodo($description: String!) {
    addTodo(description: $description) {
      id
      description
    }
  }
`;

// Component for adding a to-do item
function AddTodo() {
  let input: HTMLInputElement | null = null;
  const [addTodo] = useMutation(ADD_TODO, {
    update(cache, { data: { addTodo } }) {
      cache.modify({
        fields: {
          todos(existingTodos = []) {
            const newTodoRef = cache.writeFragment({
              data: addTodo,
              fragment: gql`
                fragment NewTodo on Todo {
                  id
                  description
                }
              `,
            });
            return existingTodos.concat(newTodoRef);
          },
        },
      });
    },
  });

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addTodo({
            variables: { description: input!.value },

            // Optimistically add the Todo to the locally cached
            // list before the server responds
            optimisticResponse: {
              addTodo: {
                id: "temp-id",
                __typename: "Todo",
                description: input!.value,
              },
            },
          });
          input!.value = "";
        }}
      >
        <input ref={(node) => (input = node)} />
        <button type="submit">Create item</button>
      </form>
    </div>
  );
}

const GET_TODOS = gql`
  {
    todos {
      id
      description
    }
  }
`;

const UPDATE_TODO = gql`
  mutation UpdateTodo($id: String!, $description: String!) {
    updateTodo(id: $id, description: $description) {
      id
      description
    }
  }
`;

type Todo = {
  id: string;
  description: string;
};

// Component for displaying the current to-do list
function Todos() {
  const { loading, error, data } = useQuery(GET_TODOS);
  const [updateTodo, { loading: mutationLoading, error: mutationError }] =
    useMutation(UPDATE_TODO);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const todos = data.todos.map(({ id, description }: Todo) => {
    let input: HTMLInputElement | null = null;

    return (
      <li key={id}>
        <p>{description}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateTodo({ variables: { id, description: input!.value } });
            input!.value = "";
          }}
        >
          <input ref={(node) => (input = node)} />
          <button type="submit">Update item</button>
        </form>
      </li>
    );
  });

  return (
    <div>
      <ul>{todos}</ul>
      {mutationLoading && <p>Loading...</p>}
      {mutationError && <p>Error: {mutationError.message}</p>}
    </div>
  );
}

function App() {
  return (
    <ApolloProvider client={client}>
      <div>
        <h2>My to-do list</h2>
        <AddTodo />
        <Todos />
      </div>
    </ApolloProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
