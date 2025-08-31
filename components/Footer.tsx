/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const Footer = () => {
    return (
        <footer className="w-full text-center py-8 mt-auto text-sm text-slate-500">
            <div className="max-w-screen-xl mx-auto flex flex-col items-center gap-2">
                 <div className="text-xs font-sans">
                    <p>
                        Powered by Gemini 2.5 Flash Image Preview | Created by{' '}
                        <a
                            href=""
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-slate-600 hover:text-blue-500 transition-colors"
                        >
                             @John
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;