import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-income-tax-calculator',
  templateUrl: './income-tax-calculator.component.html',
  styleUrls: ['./income-tax-calculator.component.scss']
})
export class IncomeTaxCalculatorComponent implements OnInit {
  income: number = 0;
  taxAmount: number = 0;
  taxCalculated: boolean = false;
  hide = true;

  constructor() {
    // ... other constructor logic ...
  }

  ngOnInit() {
    // Initialize taxAmount here based on your logic
  }

  calculateTax() {
    // ... tax calculation logic ...
  }
}
