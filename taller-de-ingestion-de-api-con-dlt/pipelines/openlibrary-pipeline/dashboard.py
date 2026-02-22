import marimo

__generated_with = "0.20.1"
app = marimo.App(width="medium")


@app.cell(hide_code=True)
def _():
    import marimo as mo
    import ibis
    import altair as alt

    return alt, ibis, mo


@app.cell(hide_code=True)
def _(ibis):
    con = ibis.connect("duckdb://open_library_pipeline.duckdb")
    return (con,)


@app.cell(hide_code=True)
def _(alt, con, mo):
    df_authors = con.sql("""
        SELECT
            an.value AS author_name,
            COUNT(DISTINCT b.key) AS book_count
        FROM open_library_data.books b
        JOIN open_library_data.books__author_name an
            ON an._dlt_parent_id = b._dlt_id
        GROUP BY an.value
        ORDER BY book_count DESC
    """).to_pandas()

    mo.ui.altair_chart(
        alt.Chart(df_authors)
        .mark_bar(color="#4C78A8")
        .encode(
            y=alt.Y("author_name:N", sort="-x", title="Autor"),
            x=alt.X("book_count:Q", title="Número de Libros"),
            tooltip=[
                alt.Tooltip("author_name:N", title="Autor"),
                alt.Tooltip("book_count:Q", title="Libros"),
            ],
        )
        .properties(
            title="Libros por Autor",
            height=alt.Step(22),
        )
    )
    return


@app.cell(hide_code=True)
def _(alt, con, mo):
    df_years = con.sql("""
        SELECT
            first_publish_year,
            COUNT(DISTINCT key) AS book_count
        FROM open_library_data.books
        WHERE first_publish_year IS NOT NULL
        GROUP BY first_publish_year
        ORDER BY first_publish_year
    """).to_pandas()

    mo.ui.altair_chart(
        alt.Chart(df_years)
        .mark_line(point=True, color="#E45756")
        .encode(
            x=alt.X(
                "first_publish_year:Q",
                title="Año de Publicación",
                axis=alt.Axis(format="d", labelAngle=-45),
            ),
            y=alt.Y("book_count:Q", title="Número de Libros"),
            tooltip=[
                alt.Tooltip("first_publish_year:Q", title="Año", format="d"),
                alt.Tooltip("book_count:Q", title="Libros"),
            ],
        )
        .properties(
            title="Libros por Año de Publicación",
            width=600,
            height=300,
        )
    )
    return


if __name__ == "__main__":
    app.run()
