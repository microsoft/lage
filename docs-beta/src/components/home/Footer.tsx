import React from "react";
import { SideBySide } from "./SideBySide";
import { TwoColumns } from "./TwoColumns";
import { Tools } from "./Tools";
import { Point } from "./Point";
import { Illustration } from "./Illustration";
import { Description } from "./Description";
import { Button } from "./Button";
import { Section } from "./Section";

export function Footer() {
  return (
    <div className="theme-color bg-bodyPrimary py-8">
      <div className="container md:mx-auto">
        <div className="mt-8" />

        <TwoColumns imageOnTop={true} imageFirst={true}>
          <Illustration src="img/frog-sing0.png" />
          <div>
            <Point>Seeing is believing— give Lage a spin</Point>
            <Description>
              There’s no better time than now to save yourself time. Get started within a minute with a single command!
            </Description>
            <SideBySide>
              <Button isEmphasized={true} to="/docs/Introducing Lage/Overview">
                Get Started
              </Button>
              <Button isEmphasized={false} to="/docs/Introducing Lage/Overview">
                Try the Demo
              </Button>
            </SideBySide>
          </div>
        </TwoColumns>

        <div className="mt-16" />
        <Section>
          <Point>Better together</Point>
          <Description>Lage works great on its own, but even better alongside its related tools.</Description>
          <Tools />
        </Section>
      </div>
    </div>
  );
}
