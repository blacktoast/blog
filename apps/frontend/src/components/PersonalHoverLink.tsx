import { useEffect, useRef, useState } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { animate } from 'motion';
import styles from './PersonalHoverLink.module.css';

type Origin = { dx: number; dy: number };

export default function PersonalHoverLink() {
	const textRef = useRef<HTMLSpanElement>(null);
	const animRef = useRef<ReturnType<typeof animate> | null>(null);
	const [origin, setOrigin] = useState<Origin | null>(null);
	const [closing, setClosing] = useState(false);

	useEffect(() => () => { animRef.current?.cancel(); }, []);

	const resetText = () => {
		const text = textRef.current;
		if (!text) return;
		animRef.current?.cancel();
		animRef.current = animate(
			text,
			{ clipPath: 'inset(0 100% 0 0)' },
			{ duration: 0.2, easing: [0.23, 1, 0.32, 1] },
		);
	};

	const handleMouseEnter = (e: MouseEvent) => {
		if (origin) return;
		const target = e.currentTarget as HTMLElement;
		const text = textRef.current;
		if (!text) return;

		animRef.current?.cancel();
		const sweep = animate(
			text,
			{ clipPath: ['inset(0 100% 0 0)', 'inset(0 0 0 0)'] },
			{ duration: 3, easing: 'linear' },
		);
		animRef.current = sweep;

		sweep.finished
			.then(() => {
				const rect = target.getBoundingClientRect();
				setOrigin({
					dx: rect.left + rect.width / 2 - window.innerWidth / 2,
					dy: rect.top + rect.height / 2 - window.innerHeight / 2,
				});
			})
			.catch(() => {});
	};

	const handleMouseLeave = () => {
		if (origin) return;
		resetText();
	};

	const closeModal = () => setClosing(true);

	const handleModalAnimEnd = () => {
		if (!closing) return;
		setOrigin(null);
		setClosing(false);
		resetText();
	};

	return (
		<>
			<span
				class={styles.wrapper}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
			>
				<span class={styles.baseText}>personal</span>
				<span ref={textRef} aria-hidden="true" class={styles.overlayText}>
					personal
				</span>
			</span>

			{origin &&
				createPortal(
					<>
						<div
							onClick={closeModal}
							class={`${styles.backdrop} ${closing ? styles.backdropExit : styles.backdropEnter}`}
						/>
						<div
							role="dialog"
							aria-modal="true"
							class={`${styles.modal} ${closing ? styles.modalExit : styles.modalEnter}`}
							style={{
								['--dx' as string]: `${origin.dx}px`,
								['--dy' as string]: `${origin.dy}px`,
							}}
							onAnimationEnd={handleModalAnimEnd}
						>
							<div class={styles.card}>
								<p class="text-sm leading-relaxed text-foreground mb-2">
									Want to get closer to me or become better friends?
								</p>
								<p class="text-sm leading-relaxed text-foreground/80 mb-3">
									Here's where you'll find my personal story.
								</p>
								<p class="text-xs text-red-400/90 mb-4">
									Disclaimer: This contains my personal story, so please don't
									click carelessly.
								</p>
								<p class="text-sm font-medium text-foreground mb-4">
									Personal 페이지로 이동하겠습니까?
								</p>
								<div class="flex gap-3 justify-end">
									<button onClick={closeModal} class={styles.btnSecondary}>
										취소
									</button>
									<a href="https://personal.haedal.blog/" class={styles.btnPrimary}>
										확인
									</a>
								</div>
							</div>
						</div>
					</>,
					document.body,
				)}
		</>
	);
}
