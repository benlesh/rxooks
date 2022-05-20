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

```tsx
import { useAsyncValues } from 'rxooks';

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function MyComp() {
	const value = useAsyncValues(
		async function () {
			await sleep(2000);

			return 'Hi!';
		},
		[], // deps
		{ initialValue: 'Loading...' }
	);

	return <div>{value}</div>;
}
```

#### async iterables

The following creates a component that increments a counter once per second using an async generator.

```tsx
import { useAsyncValues } from 'rxooks';

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function MyComp() {
	const value = useAsyncValues(
		async function* () {
			let n = 0;
			while (true) {
				yield n;
				await sleep(1000);
			}
		},
		[] // deps
	);

	return <div>Count: {value}</div>;
}
```

#### observables

The following creates a component that increments a counter once per second using an [RxJS](https://rxjs.dev) observable.

```tsx
import { useAsyncValues } from 'rxooks';
import { interval } from 'rxjs';

export function MyComp() {
	const value = useAsyncValues(
		() => interval(1000),
		[] // deps
	);

	return <div>Count: {value}</div>;
}
```

### useObservableState

This can be used to create a tuple of an observable of state changes, a setter to update the state, and a getter to get the state ad-hoc.
Setting state with this hook _will not_ cause a re-render. This hook is useful for when you want to wire a react event handler to an observable
to build reactive flows.

Note that the returned observable will synchronously emit the current value on subscription. (Similar to a "BehaviorSubject" in RxJS, an "atom" in Recoil, or several
other observable-like UI implementations folks use)

The setter allows the user to pass simple state updates, or they can pass a callback that gives them the previous state and returns the new state.

Using this is something that requires some knowledge of RxJS operators, generally. However it could be used without operators if you so choose.

#### Basic use

You might use `useObservableState` to do something like fetch data on a debounce.

```tsx
import { useObservableState, useAsyncValues } from 'rxooks';
import { debounceTime, swtichMap } from 'rxjs';

function MyComp() {
	// an observable of searches, and a setter to set the current search
	const [searches, setSearch, getSearch] = useObservableState('');

	// Here we're going to compose some reactivity using RxJS,
	// and subscribe to the observable to get the search results out.
	const searchResults = useAsyncValues(
		() =>
			searches.pipe(
				debounceTime(500),
				switchMap((search) => getSearchResults(search))
			),
		[searches] // deps
	);

	const searchResultCount = searchResults?.length ?? 0;
	const hasSearchResults = searchResultCount > 0;

	const searchChange = (e) => setSearch(e.target.value);

	// Maybe there's some other side effect you'd like to do with the
	// current value of the observable state. You can use the getter
	// for that.
	const submitForm = () => {
		// Use the getter to get the most recent value
		const lastSearch = getSearch();
		doSomethingOnFormSubmit(lastSearch);
	};

	return (
		<form onSubmit={submitForm}>
			<div>
				<label htmlFor="search-input">Search</label>
				<input id="search-input" type="text" onChange={searchChange} />
			</div>
			{hasSearchResults && (
				<ul>
					{searchResults.map((result) => (
						<li key={result.id}>{result.text}</li>
					))}
				</ul>
			)}
		</form>
	);
}
```

### useSubscription

Simply put, this just allows you to create a side effect, like `useEffect`, only you return an `Unsubscribable` instead.
That is, you return something of this shape: `{ unsubscribe: () => void }` and `useSubscriptoin` will handle the setup
and teardown based off of dependency changes, just like `useEffect` does.

This hook mostly exists to support `useAsyncValues`, however it's generally useful enough we're exporting it.

#### Primitive "subscription" example

```tsx
import { useState } from 'react';
import { useSubscription } from 'rxooks';

export function MyComp() {
	const [prefix, setPrefix] = useState('Hello!');
	const [message, setMessage] = useState('');

	useSubscription(() => {
		let n = 0;
		const id = setInterval(() => setMessage(`${prefix} ${n++}`), 1000);
		return {
			unsubscribe: () => clearInterval(id),
		};
	}, [prefix]);

	return (
		<div>
			<div>
				<label htmlFor="message-display">Message:</label>
				<output id="message-display">{message}</output>
			</div>
			<div>
				<label htmlFor="prefix-input">Message Prefix:</label>
				<input
					id="prefix-input"
					type="text"
					value={prefix}
					onChange={(e) => setPrefix(e.target.value)}
				/>
			</div>
		</div>
	);
}
```

### RxJS Subscription example

Maybe you want to set up some effect that doesn't update your view, but uses a subscription. You can use
this hook to set up and RxJS subscription that runs and does just that (unlike `useAsyncValues`, which will
emit a value that triggers a render).

```tsx
import { useSubscription } from 'rxooks';
import { interval } from 'rxjs';

export function MyComp() {
	useSubscription(
		() =>
			interval(1000).subscribe((n) => {
				console.log(`Tick ${n}`);
			}),
		[]
	);

	return <div>I'm logging in the background</div>;
}
```
