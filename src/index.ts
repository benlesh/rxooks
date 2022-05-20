/**
 * COPYRIGHT (s) 2022 Ben Lesh <ben@benlesh.com>
 * MIT License https://github.com/benlesh/rxooks/blob/main/LICENSE
 */
import { DependencyList, useEffect, useRef, useState } from 'react';
import {
	from,
	Observable,
	ObservableInput,
	Subscriber,
	Unsubscribable,
} from 'rxjs';

/**
 * A hook to allow basic handling for returning an object with an unsubscribe method
 * This is basically `useEffect` where you can return `{ unsubscribe(): void }` instead of
 * a teardown function.
 */
export function useSubscription(
	subscribe: () => Unsubscribable,
	deps?: DependencyList
) {
	useEffect(() => {
		const subscription = subscribe();
		return () => subscription.unsubscribe();
	}, deps);
}

/**
 * Get asynchronous values from any async type (Promises, Async Iterables, Observables) for
 * use during render. The async function provided will be "torn down", and subsequent Promises
 * will be ignored after deps change. The initial value can be configured with the 3rd argument
 * which is a configuration argument.
 *
 * It's recommended to add your own error handling, with a try/catch (async function), catch method (Promises),
 * or `catchError` operator (RxJS observables), et al. Within your passed `observed` argument.
 *
 * @param observed A function returning an async type to observe for values
 * @param deps An array of dependencies, that when changed will cause the `observed` function to be recalled and any previous async operation to be cancelled.
 * @param config An optional configuration to allow configuring the initial value output to the render function
 */
export function useAsyncValues<V>(
	observed: () => ObservableInput<V>,
	deps?: DependencyList | undefined,
	config?: { initialValue: undefined }
): V | undefined;

/**
 * Get asynchronous values from any async type (Promises, Async Iterables, Observables) for
 * use during render. The async function provided will be "torn down", and subsequent Promises
 * will be ignored after deps change. The initial value can be configured with the 3rd argument
 * which is a configuration argument.
 *
 * It's recommended to add your own error handling, with a try/catch (async function), catch method (Promises),
 * or `catchError` operator (RxJS observables), et al. Within your passed `observed` argument.
 *
 * @param observed A function returning an async type to observe for values
 * @param deps An array of dependencies, that when changed will cause the `observed` function to be recalled and any previous async operation to be cancelled.
 * @param config An optional configuration to allow configuring the initial value output to the render function
 */
export function useAsyncValues<V, I = V>(
	observed: () => ObservableInput<V>,
	deps: DependencyList | undefined,
	config: { initialValue: I }
): V | I;

export function useAsyncValues<V, I>(
	observed: () => ObservableInput<V>,
	deps?: DependencyList,
	config?: { initialValue?: I }
): V | I | undefined {
	const [value, setValue] = useState<V | I | undefined>(config?.initialValue);
	useSubscription(() => from(observed()).subscribe(setValue), deps);
	return value;
}

export type SetValueCallback<T> = (prev: T) => T | PromiseLike<T>;

export type ValueSetter<T> = (value: T | SetValueCallback<T>) => void;
/**
 * Basically useState that gives you an observable instead of triggering a rerender every time.
 * @returns Three things:
 * 1. An observable of values as they change, giving you the current value immediately
 * 2. A function to set the value. Calling this will cause all subscriptions to the observable to emit that value.
 * 3. A function to call to get the current value manually.
 */
export function useObservableState<T>(
	initialValue: T
): [Observable<T>, ValueSetter<T>, () => T] {
	const stateRef = useRef<[Observable<T>, ValueSetter<T>, () => T]>();

	if (!stateRef.current) {
		const subscribers = new Set<Subscriber<T>>();

		let currentValue = initialValue;

		const setValue = (value: T | SetValueCallback<T>) => {
			if (isFunction(value)) {
				const result = value(currentValue);
				if (isPromiseLike(result)) {
					result.then(setValue);
				} else {
					setValue(result);
				}
			} else {
				currentValue = value;
				for (const subscriber of subscribers) {
					subscriber.next(value);
				}
			}
		};

		const getValue = () => currentValue;

		const observable = new Observable<T>((subscriber) => {
			subscriber.next(currentValue);
			subscribers.add(subscriber);
			return () => subscribers.delete(subscriber);
		});

		stateRef.current = [observable, setValue, getValue];
	}

	return stateRef.current!;
}

function isPromiseLike(value: any): value is PromiseLike<any> {
	return typeof value === 'object' && isFunction(value.then);
}

function isFunction(value: any): value is (...args: any[]) => any {
	return typeof value === 'function';
}
