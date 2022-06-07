import React from 'react';
import Link from '@docusaurus/Link';
import "../css/tailwind-styles.css"; 
import SideBySide from './SideBySide';
import TwoColumns from './TwoColumns';
import { styles } from "../css/shared-styles.js"

export default function Header() {
    return (
        <header className="theme-color flex h-screen justify-center items-center pb-36">
            <TwoColumns>
                <div> 
                    <p className={styles.headerTitle}>Never build the <br/> same code twice</p>
                    <p className={styles.headerSubtitle}>Give your monorepo the smarts to <i>actually</i> save you time</p>
                    <SideBySide>
                        <Link className={styles.primaryButton} to="/docs/Introducing Lage/Overview">Get Started</Link>
                        <Link className={styles.button} to="/docs/Introducing Lage/Overview">Try the Demo</Link>
                    </SideBySide>

                    <p className={styles.fullLengthPara}> Build fast like these teams:</p>

                    <SideBySide>
                        <img className={styles.customerLogo} src="img/Teams.jpg"/>
                        <img className={styles.customerLogo} src="img/Loop.png"/>
                        <img className={styles.customerLogo} src="img/Office.jpg"/>
                    </SideBySide>
                </div>
                <div>
                    <img className="mx-auto w-3/4 h-3/4 px-3 md:w-full lg:w-full md:h-full lg:h-full" src="img/placeholder.png"/>
                </div>
            </TwoColumns>
        </header>
    );
}