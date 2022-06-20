import React from "react";
import { SideBySide } from "./SideBySide";
import { TwoColumns } from "./TwoColumns";
import { HeaderTitle } from "./HeaderTitle";
import { ProductDescription } from "./ProductDescription";
import { Button } from "./Button";
import { Illustration } from "./Illustration";

export default function Header() {
  return (
    <header className="theme-color bg-body-primary flex justify-center items-center pt-8 pb-24">
      <div className="2xl:w-big-screen">
        <TwoColumns imageOnTop={true} imageFirst={false}>
          <div>
            <HeaderTitle>Never build the same code twice</HeaderTitle>
            <ProductDescription>
              Give your monorepo the smarts to <i>actually</i> save you time
            </ProductDescription>
            <SideBySide>
              <Button isEmphasized={true} to="/docs/Introducing Lage/Overview">
                Get Started
              </Button>
              <Button isEmphasized={false} to="/docs/Introducing Lage/Overview">
                Try the Demo
              </Button>
            </SideBySide>
          </div>
          <Illustration src="img/frog-monitor0.png" />
        </TwoColumns>
      </div>
    </header>
  );
}
