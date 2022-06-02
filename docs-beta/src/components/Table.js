import React from 'react';
import "../css/tailwind-styles.css"; 
import { tableContents } from "./data/TableContents.json";

export default function Table() {
    return(
        <table class="table-fixed">
            <thead class="sticky top-0">
                <tr>
                    <th></th>
                    <th>{tableContents[0].name}</th>
                    <th>{tableContents[1].name}</th>
                    <th>{tableContents[2].name}</th>
                    <th>{tableContents[3].name}</th>
                    <th>{tableContents[4].name}</th>
                    <th>{tableContents[5].name}</th>
                    <th>{tableContents[6].name}</th>
                    <th>{tableContents[7].name}</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Local computation caching</td>
                    <td>{tableContents[0]["Local computation caching"]}</td>                    
                    <td>{tableContents[1]["Local computation caching"]}</td>                    
                    <td>{tableContents[2]["Local computation caching"]}</td>                    
                    <td>{tableContents[3]["Local computation caching"]}</td>                    
                    <td>{tableContents[4]["Local computation caching"]}</td>                    
                    <td>{tableContents[5]["Local computation caching"]}</td>                    
                    <td>{tableContents[6]["Local computation caching"]}</td>                    
                    <td>{tableContents[7]["Local computation caching"]}</td>                    
                </tr>
                <tr>
                    <td>Local task orchastration</td>
                    <td>{tableContents[0]["Local task orchastration"]}</td>                    
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                </tr>
                <tr>
                    <td>Distributed computation caching</td>
                    <td>{tableContents[0]["Distributed computation caching"]}</td>                    
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                </tr>
                <tr>
                    <td>Distributed task execution</td>
                    <td>{tableContents[0]["Distributed task execution"]}</td>                    
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                </tr>
                <tr>
                    <td>Transparent remote execution</td>
                    <td>{tableContents[0]["Transparent remote execution"]}</td>                    
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                </tr>
                <tr>
                    <td>Detecting affected projects/packages</td>
                    <td>{tableContents[0]["Detecting affected projects/packages"]}</td>                    
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                </tr>
                <tr>
                    <td>Workspace analysis</td>
                    <td>{tableContents[0]["Workspace analysis"]}</td>                    
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                </tr>
                <tr>
                    <td>Dependency graph visualization</td>
                    <td>{tableContents[0]["Dependency graph visualization"]}</td> 
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                </tr>
                <tr>
                    <td>Source code sharing</td>
                    <td>{tableContents[0]["Source code sharing"]}</td>                       
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                </tr>
                <tr>
                    <td>Consistent tooling</td>
                    <td>{tableContents[0]["Consistent tooling"]}</td>                    
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                </tr>
                <tr>
                    <td>Code generation</td>
                    <td>{tableContents[0]["Code generation"]}</td>                    
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                </tr>
                <tr>
                    <td>Project constraints and visibility</td>
                    <td>{tableContents[0]["Project constraints and visibility"]}</td>     
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                    <td>?</td>
                </tr>
            </tbody>
        </table>
    );
}
