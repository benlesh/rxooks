import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { useSubscription } from '.';

describe('useSubscription', () => {
	it('should exist', () => {
		expect(typeof useSubscription).toBe('function');
	});

	it('should subscribe, and unsubscribe and resubscribe if deps change', async () => {
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

	it('should subscribe on mount and unsubscribe on unmount with deps []', async () => {
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
