import React from "react";

export default function Table(props) {
  const tableContents = props.tableContents;
  return (
    <table className="table-fixed">
      <thead className="sticky top-0">
        <tr>
          <th />
          {tableContents.map((item) => (
            <th key={item.name}>{item.name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Object.keys(tableContents[0].capabilities).map((capability) => (
          <tr key={capability}>
            <td>{capability}</td>
            {tableContents.map((item) => (
              <th key={item.capabilities[capability]}>{item.capabilities[capability]}</th>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
