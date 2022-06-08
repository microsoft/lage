import React from "react";
import { SideBySide } from "./SideBySide";
import { TwoColumns } from "./TwoColumns";
import { Tools } from "./Tools";
import { Point } from "./Point";
import { Placeholder } from "./Placeholder";
import { Description } from "./Description";
import { Button } from "./Button";
import { Command } from "./Command";

export default function Footer() {
  return (
    <div className="theme-color bg-black py-8">

      <div className="mt-28"/>

      <TwoColumns>
        <Placeholder/>
        <div>
          <Point inFooter = {true}>Seeing is believing — Give Lage a spin</Point>
          <Description>There’s no better time than now to save yourself time. Get started within a minute with a single command!</Description>
          <Command>npx lage init</Command>
          <SideBySide>
            <Button isEmphasized={true} to="/docs/Introducing Lage/Overview">Get Started</Button>
            <Button isEmphasized={false} to="/docs/Introducing Lage/Overview">Try the Demo</Button>
          </SideBySide>
        </div>
      </TwoColumns>

      <div className="mt-28"/>

      <Point inFooter={true}> Better Together</Point>
      <Description>This is about the other tools that Lage work with. This is about the other tools that Lage work with. This is
        about the other tools that Lage work with. This is about the other tools that Lage work with. This is about the
        other tools that Lage work with. This is about the other tools that Lage work with. This is about the other
        tools that Lage work with.</Description>
      <Tools />
    </div>
  );
}
