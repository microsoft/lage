import React from "react";
import Link from "@docusaurus/Link";

export const Button = (props) => {
  const buttonStyle=`${props.isEmphasized ? 'font-bahnschrift text-button hover:text-black border-button bg-white inline-block py-2 px-4 rounded hover:no-underline font-bold border-2 text-lg' : 'font-bahnschrift text-white hover:text-button border-white bg-transparent inline-block py-2 px-4 rounded hover:no-underline font-bold border-2 text-lg'}`;
  return (
    <Link className={buttonStyle} to={props.to}>
      {props.children}
    </Link>
  );
}
