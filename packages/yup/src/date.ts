/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { MixedSchema } from 'yup';
import moment, { Moment } from 'moment';

const formats = ['YYYY-MM-DD', 'MMDDYYYY', 'YYYYMMDD', 'MM-DD-YYYY'];

export default class AvDateSchema extends MixedSchema<Moment> {
  format: string;

  constructor({ format = 'MM/DD/YYYY' }: Options = {}) {
    super({
      type: 'avDate',
    });

    this.format = format;

    this.withMutation((schema) => {
      if (!schema.tests.some((test) => test?.OPTIONS?.name === 'typeError')) {
        super.typeError('Date is invalid.');
      }
      schema.transform(function mutate(value) {
        return schema.getValidDate(value);
      });
    });
  }

  _typeCheck(value: Moment & { _i: string }): value is Moment & { _i: string } {
    // So as long as the passed in value is defined, moment._i will contain a string value to validate.
    // If user enters a date and then removes it, should not show a typeError
    // Note: this does not prevent other tests, like isRequired, from showing messages
    // If user has touched a required field, required error message should still show
    return value.isValid() || value._i === '';
  }

  getValidDate(value: string | Date | Moment) {
    return moment(value, [this.format, ...formats], true);
  }

  min(min: string, message?: string) {
    const minDate = this.getValidDate(min);

    return this.test({
      message: message || `Date must be ${minDate.format(this.format)} or later.`,
      name: 'min',
      exclusive: true,
      params: { min },
      test(value) {
        if (!min || !minDate.isValid()) {
          return true;
        }
        return value === null || minDate.isSameOrBefore(value);
      },
    });
  }

  max(max: string, message?: string) {
    const maxDate = this.getValidDate(max);

    return this.test({
      message: message || `Date must be ${maxDate.format(this.format)} or earlier.`,
      name: 'max',
      exclusive: true,
      params: { max },
      test(value) {
        if (!max || !maxDate.isValid()) {
          return true;
        }
        return value === null || maxDate.isSameOrAfter(value);
      },
    });
  }

  isRequired(isRequired = true, msg?: string) {
    return this.test({
      name: 'isRequired',
      exclusive: true,
      message: msg || 'This field is required.',
      test(value) {
        if (!isRequired) {
          return true;
        }

        return value !== undefined;
      },
    });
  }

  between(min: string, max: string, msg?: string, inclusivity: Inclusivity = '()') {
    const minDate = this.getValidDate(min);
    const maxDate = this.getValidDate(max);

    // Can't use arrow function because we rely on 'this' referencing yup's internals
    return this.test({
      name: 'between',
      exclusive: true, // Validation errors don't stack
      // NOTE: Intentional use of single quotes - yup will handle the string interpolation
      message: msg || `Date must be between ${minDate.format(this.format)} and ${maxDate.format(this.format)}.`,
      test(value) {
        if (!value || !min || !max || !minDate.isValid() || !maxDate.isValid()) {
          return true;
        }

        return value.isBetween(minDate, maxDate, undefined, inclusivity);
      },
    });
  }
}

export type Inclusivity = '()' | '[)' | '(]' | '[]';
type Options = { format?: string };

export const avDate = (opts?: Options): AvDateSchema => new AvDateSchema(opts);
