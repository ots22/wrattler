import {h, VNode} from 'maquette';
import * as Values from '../definitions/values'; 

function printPreview(triggerSelect:(number) => void, selectedTable:number, cellValues:Values.DataFrame) {
  let tableNames:Array<string> = Object.keys(cellValues)
  let tabComponents = printTabs(triggerSelect, selectedTable, tableNames);
  return h('div', {}, [ tabComponents, printCurrentTable(cellValues[tableNames[selectedTable]].data) ]);
}

function printTabs(triggerSelect:(number) => void, selectedTable:number, tableNames:Array<string>) {
  let buttonComponents: Array<any> = []
  for (let t = 0; t< tableNames.length; t++) {
    let buttonComponent = h('button', { class: t==selectedTable?"selected":"normal", onclick:()=> triggerSelect(t)}, [tableNames[t]])
    buttonComponents.push(buttonComponent)
  }
  return h('div', {class: "tabs"},[buttonComponents]);
}

function printCurrentTable(aTable) {
  
  let tableHeaders:Array<string> = getCurrentHeaders(aTable[0]);
  
  let rowsComponents:Array<any> = []
  let headerComponents:Array<any> = []
  // for this table, create headers
  for (let i = 0; i < tableHeaders.length; i++) {
    headerComponents.push(h('th',{}, [tableHeaders[i]]))
  }
  rowsComponents.push(h('tr',{},[headerComponents]))
  
  // for every row in dataframe, create rows
  for (let row = 0; row < aTable.length; row++) {
    let values = getCurrentRow(aTable[row], tableHeaders);
    let columnsComponents:Array<any> = []
    for (let v = 0; v < values.length; v++) {
      columnsComponents.push(h('td', {}, [values[v].toString()]))
    }
    rowsComponents.push(h('tr',{},[columnsComponents]))
  }

  let tableComponent = h('table', {style: "width:100%"},[rowsComponents]);
  return tableComponent
}

function getCurrentHeaders(firstDataFrameRow) {
  let tableHeaders:Array<string> = Object.keys(firstDataFrameRow)
  return tableHeaders;
}

function getCurrentRow(dfRow, keys) {
  let row: Array<string> = [];
  for (let k in keys) {
    row.push(dfRow[keys[k]]);
  } 
  return row;
}

export {
  printPreview
}