import { Component, OnInit } from '@angular/core';

interface TaxSlabColumn {
  id: number;
  minLimit: number;
  maxLimit: number;
  percent: number;
  taxAmount?: number;
}

@Component({
  selector: 'app-income-tax-calculator',
  templateUrl: './income-tax-calculator.component.html',
  styleUrls: ['./income-tax-calculator.component.scss']
})

export class IncomeTaxCalculatorComponent implements OnInit {
  income: number = 1200000;
  taxAmount: number = 0;
  taxCalculated: boolean = false;
  hide = true;
  investments: number = 0;
  investmentComps: number[] = [];
  numbers: TaxSlabColumn[] = [
    { id: 0, minLimit: 0, maxLimit: 250000, percent: 0, taxAmount: 0 },
    { id: 1, minLimit: 250000, maxLimit: 500000, percent: 5, taxAmount: 0 },
    { id: 2, minLimit: 500000, maxLimit: 1000000, percent: 20, taxAmount: 0 },
    { id: 3, minLimit: 1000000, maxLimit: 1500000, percent: 30, taxAmount: 0 },
    { id: 4, minLimit: 1500000, maxLimit: -1, percent: 30, taxAmount: 0 },
  ];
  taxableAmountCalcTable: any[] = [];
  persInsurance: number = 0;
  parenInsurance: number = 0;

  taxCalcTable: any[] = [];
  netTaxableIncome: number = 0;

  constructor() {
    // ... other constructor logic ...
  }

  ngOnInit() {
    this.calculateTax();
    // Initialize taxAmount here based on your logic
  }

  sumInvestments() {
    this.investments = this.investmentComps.reduce((acc, curr) => acc + curr, 0);
    // this.calculateTax();
  }

  calculateNetTaxableIncome() {
    this.taxableAmountCalcTable = [
      { item: "Net Salary", amount: this.income },
      { item: "Standard Deduction", amount: 50000 },
      { item: "PF Employer Contribution", amount: this.investmentComps[1] ? this.investmentComps[1] : 0 },
      { item: "80C", amount: this.investments > 150000 ? 150000 : this.investments },
      { item: "Personal Insurance", amount: this.persInsurance > 25000 ? 25000 : this.persInsurance },
      { item: "Personal Insurance", amount: this.parenInsurance > 25000 ? 25000 : this.parenInsurance },
    ];
    let deductibles = 0;
    this.taxableAmountCalcTable.forEach((el, i) => {
      if (i === 0) {
        return;
      }
      deductibles += el.amount;
    });
    this.netTaxableIncome = this.income - deductibles;
  }

  getTaxSlabCalculated(elem: TaxSlabColumn) {
    let slabTax = 0;
    if (this.netTaxableIncome > elem.maxLimit && elem.maxLimit != -1) {
      slabTax = (elem.maxLimit - elem.minLimit) * elem.percent / 100;
      // } else if (this.netTaxableIncome > elem.minLimit && this.netTaxableIncome < elem.maxLimit) {


    } else if (this.netTaxableIncome < elem.maxLimit) {
      slabTax = (this.netTaxableIncome - elem.minLimit) * elem.percent / 100;

    }
    return elem.taxAmount = slabTax;
  }
  calculateTax() {
    this.calculateNetTaxableIncome();
    this.numbers.forEach(element => {
      this.taxAmount += this.getTaxSlabCalculated(element);
    });
    this.taxCalcTable = [
      { item: "Tax Amount", amount: this.taxAmount },
      { item: "Cess 4%", amount: this.taxAmount * 4 / 100 },
      { item: "Net Tax Payable", amount: this.taxAmount + this.taxAmount * 4 / 100 },
    ];
  }
}
