import React from "react";
import { SideBySide } from "./SideBySide";
import { TwoColumns } from "./TwoColumns";
import { HeaderTitle }  from "./HeaderTitle";
import { ProductDescription } from "./ProductDescription";
import { Button } from "./Button";
import { Placeholder } from "./Placeholder";

export default function Header() {
  return (
    <header className="theme-color lg:flex lg:justify-center lg:items-center lg:pb-36">
      <TwoColumns>
        <div>
          <HeaderTitle>Never build the same code twice</HeaderTitle>
          <ProductDescription>Give your monorepo the smarts to <i>actually</i> save you time</ProductDescription>
          <SideBySide>
            <Button isEmphasized={true} to="/docs/Introducing Lage/Overview">Get Started</Button>
            <Button isEmphasized={false} to="/docs/Introducing Lage/Overview">Try the Demo</Button>
          </SideBySide>
        </div>
        <Placeholder src="img/placeholder.png" inHeader={true}/>
      </TwoColumns>
    </header>
  );
}
