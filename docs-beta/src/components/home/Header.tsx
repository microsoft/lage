import React from "react";
import { SideBySide } from "./SideBySide";
import { TwoColumns } from "./TwoColumns";
import { HeaderTitle } from "./HeaderTitle";
import { ProductDescription } from "./ProductDescription";
import { Button } from "./Button";
import { Illustration } from "./Illustration";

export function Header() {
  return (
    <header className="theme-color bg-bodySecondary flex justify-center items-center pt-8 pb-24">
      <div className="2xl:w-big-screen">
        <TwoColumns imageOnTop={true} imageFirst={false}>
          <div>
            <HeaderTitle>Never build the same code twice</HeaderTitle>
            <ProductDescription>
              Give your monorepo the smarts to <i>actually</i> save you time
            </ProductDescription>
            <SideBySide>
              <Button isEmphasized={true} to="/docs/Introduction">
                Get Started
              </Button>
            </SideBySide>
          </div>
          <Illustration src="img/frog.webm" />
        </TwoColumns>
      </div>
    </header>
  );
}
