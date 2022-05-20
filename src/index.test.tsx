import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { useAsyncValues, useObservableState, useSubscription } from '.';
import { Observable, Subject } from 'rxjs';

describe('useSubscription', () => {
	it('should exist', () => {
		expect(typeof useSubscription).toBe('function');
	});

	it('should subscribe, and unsubscribe and resubscribe if deps change', () => {
		function Test() {
			const [dep1, setDep1] = useState(0);
			const [dep2, setDep2] = useState(0);
			const [unsubCount, setUnsubCount] = useState(0);
			const [subCount, setSubCount] = useState(0);

			useSubscription(() => {
				setSubCount((count) => count + 1);
				return {
					unsubscribe() {
						setUnsubCount((count) => count + 1);
					},
				};
			}, [dep1, dep2]);

			return (
				<>
					<button type="button" onClick={() => setDep1((n) => n + 1)}>
						Increment Dep 1
					</button>
					<button type="button" onClick={() => setDep2((n) => n + 1)}>
						Increment Dep 2
					</button>
					<div>
						<label htmlFor="sub-called">Subscribe Called</label>
						<output id="sub-called">{subCount}</output>
					</div>
					<div>
						<label htmlFor="unsub-called">Unsubscribe Called</label>
						<output id="unsub-called">{unsubCount}</output>
					</div>
					<div>
						<label htmlFor="current-deps">Current Deps</label>
						<output id="current-deps">
							{dep1}, {dep2}
						</output>
					</div>
				</>
			);
		}

		render(<Test />);

		expect(screen.getByLabelText('Subscribe Called')).toHaveTextContent('1');
		expect(screen.getByLabelText('Unsubscribe Called')).toHaveTextContent('0');
		expect(screen.getByLabelText('Current Deps')).toHaveTextContent('0, 0');

		fireEvent.click(screen.getByText('Increment Dep 1'));

		expect(screen.getByLabelText('Subscribe Called')).toHaveTextContent('2');
		expect(screen.getByLabelText('Unsubscribe Called')).toHaveTextContent('1');
		expect(screen.getByLabelText('Current Deps')).toHaveTextContent('1, 0');

		fireEvent.click(screen.getByText('Increment Dep 2'));

		expect(screen.getByLabelText('Subscribe Called')).toHaveTextContent('3');
		expect(screen.getByLabelText('Unsubscribe Called')).toHaveTextContent('2');
		expect(screen.getByLabelText('Current Deps')).toHaveTextContent('1, 1');
	});

	it('should subscribe on mount and unsubscribe on unmount with deps []', () => {
		let subscribeCount = 0;
		let unsubscribeCount = 0;

		function UseSubscriptionComp() {
			useSubscription(() => {
				subscribeCount++;
				return {
					unsubscribe() {
						unsubscribeCount++;
					},
				};
			}, []);

			return <></>;
		}

		function Test() {
			const [show, setShow] = useState(false);

			return (
				<>
					<button type="button" onClick={() => setShow((s) => !s)}>
						Toggle
					</button>
					{show && <UseSubscriptionComp />}
				</>
			);
		}

		render(<Test />);

		expect(subscribeCount).toBe(0);
		expect(unsubscribeCount).toBe(0);

		fireEvent.click(screen.getByText('Toggle'));
		expect(subscribeCount).toBe(1);
		expect(unsubscribeCount).toBe(0);

		fireEvent.click(screen.getByText('Toggle'));
		expect(subscribeCount).toBe(1);
		expect(unsubscribeCount).toBe(1);

		fireEvent.click(screen.getByText('Toggle'));
		expect(subscribeCount).toBe(2);
		expect(unsubscribeCount).toBe(1);

		fireEvent.click(screen.getByText('Toggle'));
		expect(subscribeCount).toBe(2);
		expect(unsubscribeCount).toBe(2);
	});
});

describe('useAsyncValues', () => {
	function Test({
		source,
		initialValue,
	}: {
		source: Observable<number>;
		initialValue?: number;
	}) {
		const value = useAsyncValues(() => source, [source], { initialValue });

		return (
			<div>
				<label htmlFor="value">Value</label>
				<output id="value">{value}</output>
			</div>
		);
	}

	it('should work with RxJS observables', () => {
		const subject = new Subject<number>();

		render(<Test source={subject} />);
		expect(screen.getByLabelText('Value')).toHaveTextContent('');

		act(() => subject.next(1));
		expect(screen.getByLabelText('Value')).toHaveTextContent('1');

		act(() => subject.next(1337));
		expect(screen.getByLabelText('Value')).toHaveTextContent('1337');
	});

	it('should work with RxJS observables and initialValues', () => {
		const subject = new Subject<number>();

		render(<Test source={subject} initialValue={1000} />);
		expect(screen.getByLabelText('Value')).toHaveTextContent('1000');

		act(() => subject.next(1));
		expect(screen.getByLabelText('Value')).toHaveTextContent('1');

		act(() => subject.next(1337));
		expect(screen.getByLabelText('Value')).toHaveTextContent('1337');
	});

	it('should work with async generator functions', async () => {
		const [gate1, triggerGate1] = createGate();
		const [gate2, triggerGate2] = createGate();
		function AsyncGenTest() {
			const value = useAsyncValues(async function* () {
				yield 1;
				await gate1;
				yield 2;
				await gate2;
				yield 3;
			}, []);

			return (
				<div>
					<label htmlFor="value">Value</label>
					<output id="value">{value}</output>
				</div>
			);
		}

		render(<AsyncGenTest />);
		await act(() => {});
		expect(screen.getByLabelText('Value')).toHaveTextContent('1');

		await triggerGate1();
		expect(screen.getByLabelText('Value')).toHaveTextContent('2');

		await triggerGate2();
		expect(screen.getByLabelText('Value')).toHaveTextContent('3');
	});

	it('should work with async functions', async () => {
		const [gate, triggerGate] = createGate();
		function AsyncFnTest() {
			const value = useAsyncValues(async () => {
				await gate;
				return 'WEEE';
			}, []);

			return (
				<div>
					<label htmlFor="value">Value</label>
					<output id="value">{value}</output>
				</div>
			);
		}

		render(<AsyncFnTest />);
		expect(screen.getByLabelText('Value')).toHaveTextContent('');

		await triggerGate();
		expect(screen.getByLabelText('Value')).toHaveTextContent('WEEE');
	});

	it('should work with async functions with initial value', async () => {
		const [gate, triggerGate] = createGate();
		function AsyncFnTest() {
			const value = useAsyncValues(
				async () => {
					await gate;
					return 'WEEE';
				},
				[],
				{ initialValue: 'LOADING...' }
			);

			return (
				<div>
					<label htmlFor="value">Value</label>
					<output id="value">{value}</output>
				</div>
			);
		}

		render(<AsyncFnTest />);
		expect(screen.getByLabelText('Value')).toHaveTextContent('LOADING...');

		await triggerGate();
		expect(screen.getByLabelText('Value')).toHaveTextContent('WEEE');
	});
});

describe('useObservableState', () => {
	it('should create observable state with value setter callback', () => {
		function Test() {
			const [values, setValue] = useObservableState(0);

			const value = useAsyncValues(() => values, [values]);

			return (
				<div>
					<button
						type="button"
						onClick={() => {
							setValue((n) => n + 1);
						}}
					>
						Increment
					</button>
					<div>
						<label htmlFor="value">Value</label>
						<output id="value">{value}</output>
					</div>
				</div>
			);
		}

		render(<Test />);

		expect(screen.getByLabelText('Value')).toHaveTextContent('0');
		fireEvent.click(screen.getByText('Increment'));
		expect(screen.getByLabelText('Value')).toHaveTextContent('1');
		fireEvent.click(screen.getByText('Increment'));
		expect(screen.getByLabelText('Value')).toHaveTextContent('2');
		fireEvent.click(screen.getByText('Increment'));
		expect(screen.getByLabelText('Value')).toHaveTextContent('3');
	});

	it('should create observable state with plain value setter', () => {
		function Test() {
			const [usernames, setUsername, getUsername] = useObservableState('');

			const username = useAsyncValues(() => usernames, [usernames], {
				initialValue: getUsername(),
			});

			return (
				<div>
					<div>
						<label htmlFor="username">Username</label>
						<input
							id="username"
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
						/>
					</div>
					<div>
						<label htmlFor="username-output">Username is</label>
						<output id="username-output">{username}</output>
					</div>
				</div>
			);
		}

		render(<Test />);

		expect(screen.getByLabelText('Username is')).toHaveTextContent('');

		fireEvent.change(screen.getByLabelText('Username'), {
			target: { value: 'benlesh' },
		});

		expect(screen.getByLabelText('Username is')).toHaveTextContent('benlesh');
	});
});

function createGate(): [Promise<void>, () => Promise<void>] {
	let resolver: () => void;
	const gate = new Promise<void>((res) => (resolver = res));
	const trigger = async () =>
		act(async () => {
			resolver!();
			await gate;
		});
	return [gate, trigger!];
}
