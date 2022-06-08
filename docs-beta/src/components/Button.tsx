import React from "react";
import Link from "@docusaurus/Link";

export const Button = (props) => {
  const buttonStyle=`font-bahnschrift inline-block py-2 px-4 rounded hover:no-underline font-bold border-2 text-lg ${props.isEmphasized ? 'text-button hover:text-black border-button bg-white' : 'text-white hover:text-button border-white bg-transparent'}`;
  return (
    <Link className={buttonStyle} to={props.to}>
      {props.children}
    </Link>
  );
}
