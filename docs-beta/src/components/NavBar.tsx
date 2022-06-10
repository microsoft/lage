import React from "react";
import { useState } from "react";
import { NavButton } from "./NavButton";
import { Cross } from "./Cross";
import { Hamburger } from "./Hamburger";
import { HamburgerButton } from "./HamburgerButton";

export default function NavBar() {
    const [isNavOpen, setIsNavOpen] = useState(false);
    return (
        <div className="pl-4 pr-20 mb-8">
            <div className="flex items-center py-1">
                <nav>
                    <section className="flex py-4 md:hidden lg:hidden">
                        {/*Creating the hamburger menu lines*/}
                        <div onClick={() => setIsNavOpen((prev) => !prev)}>
                            <Hamburger/>
                        </div>
                        <div className={isNavOpen ? "top-0 left-0 flex flex-col items-start justify-start align-top block absolute w-1/2 h-screen bg-white " : "hidden"}>
                            {/*Creating the cross to exit the hamburger menu*/}
                            <div className="absolute top-0 right-0 px-8 py-8"
                                 onClick={() => setIsNavOpen(false)}>
                                <Cross/>
                            </div>
                            {/*Contents of the hamburger menu*/}
                            <div className="flex flex-col space-y-2 px-4 py-24">
                                <HamburgerButton to="/docs/Introducing Lage/Overview">Guide</HamburgerButton>
                                <HamburgerButton to="https://github.com/microsoft/lage">GitHub</HamburgerButton>
                            </div>
                        </div>
                    </section>
                </nav>
            </div>
            {/*Contents of the navigation bar*/}
            <div className="flex justify-between invisible md:visible lg:visible">
                {/*Aligned to left*/}
                <div className="flex items-center">
                    <img className="w-8 h-8" src="img/lage-logo.svg" alt="Logo"/>
                    <NavButton to=".">Lage</NavButton>
                    <NavButton to="/docs/Introducing Lage/Overview">Guide</NavButton>
                </div>
                {/*Aligned to right*/}
                <div className="flex items-center">
                    <a href="https://github.com/microsoft/lage">
                        <img className="w-8 h-8" src="img/Github.png" alt="GitHub"/>
                    </a>
                </div>
            </div>
        </div>
    );
  };
  


