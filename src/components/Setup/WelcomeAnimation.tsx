'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Welcome animation component for new users.
 * Shows branding animation and automatically completes setup.
 * No configuration UI is shown - all config is done via environment variables.
 */
const WelcomeAnimation = () => {
    const [showWelcome, setShowWelcome] = useState(true);
    const [showGettingReady, setShowGettingReady] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);

    const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

    useEffect(() => {
        (async () => {
            // Show welcome message
            await delay(2500);
            setShowWelcome(false);

            await delay(600);
            setShowGettingReady(true);

            // Auto-complete setup after animation
            await delay(2000);
            setIsCompleting(true);

            try {
                const res = await fetch('/api/config/setup-complete', {
                    method: 'POST',
                });

                if (res.ok) {
                    // Small delay for smooth transition, then reload
                    await delay(500);
                    window.location.reload();
                } else {
                    console.error('Failed to complete setup');
                    // Still reload to show the main app
                    window.location.reload();
                }
            } catch (error) {
                console.error('Error completing setup:', error);
                window.location.reload();
            }
        })();
    }, []);

    return (
        <div className="bg-light-primary dark:bg-dark-primary h-screen w-screen fixed inset-0 overflow-hidden">
            <AnimatePresence>
                {showWelcome && (
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                        <motion.div
                            className="absolute flex flex-col items-center justify-center h-full"
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            transition={{ duration: 0.6 }}
                        >
                            <motion.h2
                                transition={{ duration: 0.6 }}
                                initial={{ opacity: 0, translateY: '30px' }}
                                animate={{ opacity: 1, translateY: '0px' }}
                                className="text-4xl md:text-6xl xl:text-8xl font-normal font-['Instrument_Serif'] tracking-tight text-center px-4"
                            >
                                Welcome to{' '}
                                <span className="text-[#24A0ED] italic font-['PP_Editorial']">
                                    Gradia-AIEngine
                                </span>
                            </motion.h2>
                            <motion.p
                                transition={{ delay: 0.8, duration: 0.7 }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-black/70 dark:text-white/70 text-sm md:text-lg xl:text-2xl mt-2"
                            >
                                <span className="font-light">Web search,</span>{' '}
                                <span className="font-light font-['PP_Editorial'] italic">
                                    reimagined
                                </span>
                            </motion.p>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{
                                opacity: 0.2,
                                scale: 1,
                                transition: { delay: 0.8, duration: 0.7 },
                            }}
                            exit={{ opacity: 0, scale: 1.1, transition: { duration: 0.6 } }}
                            className="bg-[#24A0ED] left-50 translate-x-[-50%] h-[250px] w-[250px] rounded-full relative z-40 blur-[100px]"
                        />
                    </div>
                )}
                {showGettingReady && (
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                        <motion.div
                            className="flex flex-col items-center justify-center"
                            initial={{ opacity: 0, translateY: '30px' }}
                            animate={{ opacity: 1, translateY: '0px' }}
                            transition={{ duration: 0.6 }}
                        >
                            <motion.p
                                className="text-2xl md:text-4xl xl:text-6xl font-normal font-['Instrument_Serif'] tracking-tight text-center px-4"
                            >
                                {isCompleting ? (
                                    <>
                                        <span className="text-[#24A0ED] italic font-['PP_Editorial']">
                                            Ready
                                        </span>{' '}
                                        to go!
                                    </>
                                ) : (
                                    <>
                                        Getting{' '}
                                        <span className="text-[#24A0ED] italic font-['PP_Editorial']">
                                            everything
                                        </span>{' '}
                                        ready for you...
                                    </>
                                )}
                            </motion.p>
                            {!isCompleting && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="mt-8"
                                >
                                    <div className="w-8 h-8 border-2 border-[#24A0ED] border-t-transparent rounded-full animate-spin" />
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WelcomeAnimation;
