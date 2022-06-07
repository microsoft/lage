import React from 'react';
import { styles } from "../css/shared-styles";

export default function Table(props) {
    const tableContents = props.tableContents;
    return(
        <table className="table-fixed">
            <thead className="sticky top-0">
                <tr>
                    <th className={styles.table}/>
                    {tableContents.map((item) =>
                        <th className={styles.table}>{item.name}</th>
                    )}
                </tr>
            </thead>
            <tbody>
                 {Object.keys(tableContents[0].capabilities).map((capability) =>
                    <tr><td className={styles.table}>{capability}</td>
                    {tableContents.map((item) =>
                        <th className={styles.table}>{item.capabilities[capability]}</th>
                    )}</tr>
                )}
            </tbody>
        </table>
    );
}
