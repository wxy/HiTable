HiTable: Instant Analysis of Web Page Table Data
===

> Analyze data instantly on web page tables, without leaving the page, without copying data, without Excel.

![](assets/tile-1.png)

This extension calculates statistics for table rows and columns instantly and in-place.

HiTable is a powerful browser extension designed to simplify your data analysis tasks. It allows you to perform instant, in-place calculations on HTML tables directly within your browser. No more copying and pasting tables into Excel or other tools for basic computations. With HiTable, you can easily calculate sums, averages, counts, and variances for rows and columns. It's perfect for quick data analysis, auditing data, or just exploring numbers on web pages. 

### Supported Statistical Algorithms

HiTable supports 15 statistical algorithms, organized into 4 groups:

- **Basic Statistics**: CNT (Count), SUM (Sum), AVG (Average), MIN (Minimum), MAX (Maximum), RNG (Range)
- **Advanced Statistics**: MED (Median), STD (Standard Deviation), VAR (Variance), MOD (Mode)
- **Quantile Statistics**: Q1 (First Quartile), Q3 (Third Quartile), IQR (Interquartile Range)
- **Distribution Statistics**: SKW (Skewness), KUR (Kurtosis)

You can enable or disable any algorithm in the configuration page. 

### How to Use

First, after installing this extension, you need to pin it to the browser's toolbar. By default, this extension is not activated, and the icon in the toolbar is displayed in gray. When you need to use this extension for table data calculation, click the icon in the toolbar to activate the extension, at which point the icon will be displayed as an icon with a green frame.

![](../assets/inactive.png)
![](../assets/active.png)

Please open a page that contains a data table, such as: 
https://en.wikipedia.org/wiki/Economy_of_the_United_States#Data

Once activated, you can select a rectangular area in the table by pressing the left mouse button and dragging. Release the mouse to end the selection, and an overlay will pop up outside the selected area, displaying various statistics for the rows and columns of the selected area on the four edges. The counterclockwise left side of these four edges shows the statistical algorithm being used by each edge.

![](assets/screenshot-1.png)

You can cancel the selection by clicking on a cell outside the selected area or pressing the `Esc` key. When the `Shift` key is pressed, dragging the selection in the first row or first column will select multiple entire columns or rows; if you click on the top left cell of the table (i.e., the first cell of the first row) while pressing the `Shift` key, the entire table will be selected.

Clicking on the four corners of the floating layer can switch between multiple statistical algorithms. Pressing `CTRL-C` (or `Meta-C` on a Mac) can copy the selected area, and the copied content can be pasted into tools like Excel, Numbers, etc. for more complex processing. If you press `CTRL-C` (or `Meta-C` on a Mac) twice in quick succession, you can copy all the data including the floating layer and the selected area.

For non-numeric cells, a strikethrough will be marked on them during selection, and the cell will be skipped during calculation. When moving the mouse within the selected area, a cross line will be highlighted to clearly find the statistical results corresponding to that row or column.

![](assets/screenshot-2.png)

Right-click on the extension icon, and you can select "Config" in the right-click menu, which will open the configuration page. On this page, you can configure the border color of the extension, the default statistical algorithm for the four sides, etc.

![](assets/config-en.png)

### Error Reporting and Feature Suggestions

If you encounter any problems during use (for example, some tables cannot be correctly selected or the statistics layer is not displayed correctly), or have any feature suggestions, please submit an issue on [GitHub](https://github.com/wxy/HiTable/issues).

### Privacy Policy

HiTable does not collect any user data. All data is processed on the user's computer.

HiTable is open-source software, following the MIT license. You can view the source code on [GitHub](https://github.com/wxy/HiTable).