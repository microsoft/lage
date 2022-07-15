import React from "react";

export const Table = (props) => {
  const tableContents = props.tableContents;
  return (
    <table className="table-fixed">
      <thead className="sticky top-0">
        <tr>
          <th className="bg-primary font-bahnschrift text-black whitespace-pre-wrap pt-4 text-base px-12" />
          {tableContents.map((item) => (
            <th className="bg-primary font-bahnschrift text-black whitespace-pre-wrap pt-4 text-base px-12">
              {item.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Object.keys(tableContents[0].capabilities).map((capability) => (
          <tr>
            <td className="bg-primary font-bahnschrift text-black whitespace-pre-wrap pt-4 text-base px-12">
              {capability}
            </td>
            {tableContents.map((item) => (
              <th className="bg-primary font-bahnschrift text-black whitespace-pre-wrap pt-4 text-base px-12">
                {item.capabilities[capability]}
              </th>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
