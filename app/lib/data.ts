// import { sql } from '@vercel/postgres';
import { unstable_noStore as noStore } from 'next/cache';
import { supabase } from './supabase-client';
import { formatCurrency } from './utils';

export interface Customer {
  name: string;
  image_url: string;
  email: string;
}

export interface Invoice {
  id: string;
  amount: number;
  date: string;
  status: 'pending' | 'paid';
  customers: Customer;
}


export async function fetchRevenue() {
  noStore();
  try {
    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const { data, error } = await supabase
      .from('revenue')
      .select('*');

    if (error) throw error;
    console.log('Data fetch completed after 3 seconds.');
    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  noStore();
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id,
        amount,
        date,
        customer:customer_id (name, image_url, email)
      `)
      .order('date', { ascending: false })
      .limit(5);

    if (error) throw error;

    // Type assertion here
    const typedData = data as unknown as Invoice[];
    console.log('typedData:', typedData);
    const latestInvoices = typedData.map(invoice => {
      const customer = invoice.customer;
      return {
        id: invoice.id,
        amount: formatCurrency(invoice.amount),
        date: invoice.date,
        name: customer.name,
        image_url: customer.image_url,
        email: customer.email
      }
    })

    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}


export async function fetchCardData() {
  noStore();
  try {
    // This might require separate queries or a more complex query
    // depending on your database schema and requirements.
    const invoices = await supabase.from('invoices').select('status, amount');
    const customers = await supabase.from('customers').select('id');

    if (invoices.error) throw invoices.error;
    if (customers.error) throw customers.error;

    const numberOfInvoices = invoices.data.length;
    const numberOfCustomers = customers.data.length;
    const totalPaidInvoices = invoices.data
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const totalPendingInvoices = invoices.data
      .filter(inv => inv.status === 'pending')
      .reduce((sum, inv) => sum + inv.amount, 0);

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices: formatCurrency(totalPaidInvoices),
      totalPendingInvoices: formatCurrency(totalPendingInvoices),
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;

export async function fetchFilteredInvoices(query: string, currentPage: number) {
  noStore();
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE - 1;

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id,
        amount,
        date,
        status,
        customers:customer_id (name, email, image_url)
      `)
      .ilike('customers.name', `%${query}%`)
      .order('date', { ascending: false })
      .range(start, end);

    if (error) throw error;

    const typedData = data as unknown as Invoice[];
    const filteredInvoices = typedData.map(invoice => {
      const customer = invoice.customers;
      return {
        id: invoice.id,
        amount: formatCurrency(invoice.amount),
        date: invoice.date,
        status: invoice.status,
        name: customer?.name,
        image_url: customer?.image_url,
        email: customer?.email
      };
  });

    return filteredInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch filtered invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  noStore();
  try {
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .ilike('customers.name', `%${query}%`)
      .or(`customers.email.ilike.%${query}%,amount.ilike.%${query}%,date.ilike.%${query}%,status.ilike.%${query}%`);

    const totalPages = Math.ceil(count || 0 / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoice pages.');
  }
}

export async function fetchInvoiceById(id: string) {
  noStore();
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id,
        customer_id,
        amount,
        status
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      ...data,
      amount: data.amount / 100 // Convert amount from cents to dollars if needed
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  noStore();
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) throw error;

    return data;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  noStore();
  try {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        email,
        image_url,
        invoices!inner (amount, status)
      `)
      .ilike('name', `%${query}%`)
      .or(`email.ilike.%${query}%`)
      .order('name', { ascending: true });

    if (error) throw error;

    const customers = data.map(customer => ({
      ...customer,
      total_pending: formatCurrency(customer.invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0)),
      total_paid: formatCurrency(customer.invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0)),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch filtered customers.');
  }
}

export async function getUser(email: string) {
  noStore();
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}


// export async function fetchFilteredInvoices(
//   query: string,
//   currentPage: number,
// ) {
//   const offset = (currentPage - 1) * ITEMS_PER_PAGE;

//   try {
//     const invoices = await sql<InvoicesTable>`
//       SELECT
//         invoices.id,
//         invoices.amount,
//         invoices.date,
//         invoices.status,
//         customers.name,
//         customers.email,
//         customers.image_url
//       FROM invoices
//       JOIN customers ON invoices.customer_id = customers.id
//       WHERE
//         customers.name ILIKE ${`%${query}%`} OR
//         customers.email ILIKE ${`%${query}%`} OR
//         invoices.amount::text ILIKE ${`%${query}%`} OR
//         invoices.date::text ILIKE ${`%${query}%`} OR
//         invoices.status ILIKE ${`%${query}%`}
//       ORDER BY invoices.date DESC
//       LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
//     `;

//     return invoices.rows;
//   } catch (error) {
//     console.error('Database Error:', error);
//     throw new Error('Failed to fetch invoices.');
//   }
// }

// export async function fetchInvoicesPages(query: string) {
//   try {
//     const count = await sql`SELECT COUNT(*)
//     FROM invoices
//     JOIN customers ON invoices.customer_id = customers.id
//     WHERE
//       customers.name ILIKE ${`%${query}%`} OR
//       customers.email ILIKE ${`%${query}%`} OR
//       invoices.amount::text ILIKE ${`%${query}%`} OR
//       invoices.date::text ILIKE ${`%${query}%`} OR
//       invoices.status ILIKE ${`%${query}%`}
//   `;

//     const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
//     return totalPages;
//   } catch (error) {
//     console.error('Database Error:', error);
//     throw new Error('Failed to fetch total number of invoices.');
//   }
// }

// export async function fetchInvoiceById(id: string) {
//   try {
//     const data = await sql<InvoiceForm>`
//       SELECT
//         invoices.id,
//         invoices.customer_id,
//         invoices.amount,
//         invoices.status
//       FROM invoices
//       WHERE invoices.id = ${id};
//     `;

//     const invoice = data.rows.map((invoice) => ({
//       ...invoice,
//       // Convert amount from cents to dollars
//       amount: invoice.amount / 100,
//     }));

//     return invoice[0];
//   } catch (error) {
//     console.error('Database Error:', error);
//     throw new Error('Failed to fetch invoice.');
//   }
// }

// export async function fetchCustomers() {
//   try {
//     const data = await sql<CustomerField>`
//       SELECT
//         id,
//         name
//       FROM customers
//       ORDER BY name ASC
//     `;

//     const customers = data.rows;
//     return customers;
//   } catch (err) {
//     console.error('Database Error:', err);
//     throw new Error('Failed to fetch all customers.');
//   }
// }

// export async function fetchFilteredCustomers(query: string) {
//   try {
//     const data = await sql<CustomersTableType>`
// 		SELECT
// 		  customers.id,
// 		  customers.name,
// 		  customers.email,
// 		  customers.image_url,
// 		  COUNT(invoices.id) AS total_invoices,
// 		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
// 		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
// 		FROM customers
// 		LEFT JOIN invoices ON customers.id = invoices.customer_id
// 		WHERE
// 		  customers.name ILIKE ${`%${query}%`} OR
//         customers.email ILIKE ${`%${query}%`}
// 		GROUP BY customers.id, customers.name, customers.email, customers.image_url
// 		ORDER BY customers.name ASC
// 	  `;

//     const customers = data.rows.map((customer) => ({
//       ...customer,
//       total_pending: formatCurrency(customer.total_pending),
//       total_paid: formatCurrency(customer.total_paid),
//     }));

//     return customers;
//   } catch (err) {
//     console.error('Database Error:', err);
//     throw new Error('Failed to fetch customer table.');
//   }
// }

// export async function getUser(email: string) {
//   try {
//     const user = await sql`SELECT * FROM users WHERE email=${email}`;
//     return user.rows[0] as User;
//   } catch (error) {
//     console.error('Failed to fetch user:', error);
//     throw new Error('Failed to fetch user.');
//   }
// }
