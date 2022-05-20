# rxooks

_GADZOOKS! RXOOKS!_

(Basically every other iteration of "rxjs", "rx", "react", and "hooks" was taken)

This is a library of hooks that are useful with async code. Generally, these small, lightweight hooks are all you will need in most case.

What is this good for?

1. async effects that are cancellable and give you values using:

- promises (and async/await)
- async iterators (async function\*)
- Observables! (obviously)

2. creating updatable state that will give you something reactive, rather than firing a new render (ala `useState`)

3. Dealing with any type that returns an "unsubscribable" `{ unsubscribe: () => void }`, like an RxJS `Subscription`

## Installation

`npm i -S rxooks`

## Hooks

### useAsyncValues

This is a hook that allows you to start an async effect that will self-cancel on dependency changes, pretty much like `useEffect` only it outputs a value, and you can use `async function`, `async function*` or any function that returns `Promise`, `AsyncIterable`, or `Observable`, (including things that implement `Symbol.observable`).

#### async functions

The code below will display "Loading..", and then "Hi!" after 2 seconds.

```ts
import { useAsyncValues } from 'rxooks';

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function MyComp() {
	const value = useAsyncValues(
		async function () {
			await sleep(2000);

			return 'Hi!';
		},
		[
			/* deps */
		],
		{ initialValue: 'Loading...' }
	);

	return <div>{value}</div>;
}
```

#### async iterables

The following creates a component that increments a counter once per second using an async generator.

```ts
import { useAsyncValues } from 'rxooks';

function MyComp() {
	const value = useAsyncValues(
		async function* () {
			let n = 0;
			while (true) {
				yield n;
				await sleep(1000);
			}
		},
		[
			/* deps */
		]
	);

	return <div>Count: {value}</div>;
}
```

#### observables

```ts
import { useAsyncValues } from 'rxooks';
import { interval } from 'rxjs';

function App() {
	const value = useAsyncValues(
		() => interval(1000),
		[
			/* deps */
		]
	);

	return <div>Count: {value}</div>;
}

export default App;
```
