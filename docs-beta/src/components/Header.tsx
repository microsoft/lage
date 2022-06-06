import React from 'react';
import Link from '@docusaurus/Link';
import SideBySide from './SideBySide';
import TwoColumns from './TwoColumns';
import { styles } from "./shared-styles"

export default function Header() {
    return (
        <header className="theme-dark bg-brand flex h-screen justify-center items-center">
            <TwoColumns>
                <div>
                    <p className={styles.headerTitle}>Never rebuild your code again.</p>
                    <p className={styles.headerSubtitle}>Lage is a beautiful JS monorepo task runner.</p>
                    <SideBySide>
                        <Link className={styles.button} to="/docs/Introducing Lage/Overview">Get Started</Link>
                        <Link className={styles.button} to="/docs/Introducing Lage/Overview">Try the Demo</Link>
                    </SideBySide>

                    <p className={styles.fullLengthPara}> Be one of the cool kids using Lage.</p>

                    <SideBySide>
                        <img className={styles.customerLogo} src="http://placekitten.com/75/75"/>
                        <img className={styles.customerLogo} src="http://placekitten.com/75/75"/>
                        <img className={styles.customerLogo} src="http://placekitten.com/75/75"/>
                    </SideBySide>
                </div>
                <div>
                    <img className="mx-auto w-3/4 h-3/4 px-3 md:w-full lg:w-full md:h-full lg:h-full" src="http://placekitten.com/300/300"/>
                </div>
            </TwoColumns>
        </header>
    );
}