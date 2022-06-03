import React from 'react';
import "../css/tailwind-styles.css"; 

export default function Table(props) {
    const tableContents = props.tableContents;
    return(
        <table class="table-fixed">
            <thead class="sticky top-0">
                <tr>
                    <th/>
                    {tableContents.map((item) =>
                        <th>{item.name}</th>
                    )}
                </tr>
            </thead>
            <tbody>
                 {Object.keys(tableContents[0].capabilities).map((capability) =>
                    <tr><td>{capability}</td>
                    {tableContents.map((item) =>
                        <th>{item.capabilities[capability]}</th>
                    )}</tr>
                )}
            </tbody>
        </table>
    );
}
